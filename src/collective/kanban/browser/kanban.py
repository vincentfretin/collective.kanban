from zope.interface import implements
from Products.CMFCore.utils import getToolByName
from Products.Five.browser.pagetemplatefile import ViewPageTemplateFile
from plone.app.layout.globals.interfaces import IViewView
from Products.Poi.browser.tracker import IssueFolderView

from json import JSONEncoder

from string import Template


def json(method):

    def json_method(*arg, **kwargs):
        value = method(*arg, **kwargs)
        return JSONEncoder().encode(value)

    return json_method


def cmp_releases(a, b):
    if a in ("backlog", "(UNASSIGNED)"):
        return -1
    else:
        return cmp(a, b)


class Kanban(IssueFolderView):
    implements(IViewView)

    index = ViewPageTemplateFile('kanban.pt')

    def getOpenStates(self):
        raise NotImplementedError

    def getOrderedWorkflowStates(self):
        raise NotImplementedError

    def getStates(self):
        raise NotImplementedError

    def getIssueTemplate(self):
        issue_template = """
<div data-allowedstates="$allowedstates" id="issue-$issue" draggable="true" class="issue">
  <div class="issue-inner issue-type-$type" data-issue="$issue">
  <a href="$issue" class="issue-num">#$issue</a>
  <span class="issue-actions">
    <a href="$issue/edit" target="_blank"><img src="edit.gif"></a>
  </span>
  <p class="issue-title">$title</p>
  <span class="complexity">$complexity</span>
  <span class="owner">$owner</span>
  </div>
</div>"""
        return issue_template

    def renderIssue(self, issue):
        infos = self.getIssueInfos(issue.getObject())
        issue_template = self.getIssueTemplate()
        return Template(issue_template).safe_substitute(infos)

    def getIssueInfos(self, issue):
        raise NotImplementedError

    def __call__(self):
        self.request.form['sort_on'] = 'created'
        self.request.form['sort_order'] = 'ascending'
        if 'state' not in self.request.form:
            self.request.form['state'] = self.getOpenStates()

        issues = self.getFilteredIssues(**self.request.form)
        self.issues_by_state = {}
        states = self.request.form.get('state')
        self.columns = [state
                for state in self.getOrderedWorkflowStates() if state in states]
        self.areas = sorted(frozenset([issue.getArea for issue in issues]))
        self.releases = sorted(
                frozenset([issue.getTargetRelease for issue in issues]),
                cmp=cmp_releases)

        for column in self.columns:
            self.issues_by_state[column] = []

        for issue in issues:
            self.issues_by_state[issue.review_state].append(issue)

        if 'unconfirmed' in self.columns and not self.issues_by_state['unconfirmed']:
            self.columns.remove('unconfirmed')

        return self.index()

    def _available_transitions(self, issue):
        wtool = getToolByName(self.context, "portal_workflow")
        actions = wtool.listActionInfos(object=issue)
        res = [a['transition'] for a in actions if a['category'] == 'workflow']
        return res

    def availableTargetStates(self, issue):
        res = [tdef.new_state_id
               for tdef in self._available_transitions(issue)]
        return ' '.join(res)

    def beforeCreateResponse(self, issue):
        pass

    @json
    def changeIssueState(self):
        res = {'status': 'ok'}
        try:
            form = self.request.form
            issue_num = form.pop('issue')
            issue = self.context.restrictedTraverse(issue_num)
            if 'area' in form:
                area = form.pop('area')
                if area != issue.getArea():
                    issue.setArea(area)
                    issue.reindexObject(idxs=['getArea'])

            wtool = getToolByName(self.context, "portal_workflow")
            state = wtool.getInfoFor(issue, 'review_state')
            self.create_response = False
            if 'state' in form and form['state'] != state:
                state = form.pop('state')
                state_changed = False
                for transition in self._available_transitions(issue):
                    if transition.new_state_id == state:
                        form['transition'] = transition.id
                        state_changed = True
                        break

                if not state_changed:
                    return {'status': 'ko',
                            'message': "There is no transition to this state."}

                self.create_response = True

            if 'targetRelease' in form and form['targetRelease'] != issue.getTargetRelease():
                self.create_response = True

            self.beforeCreateResponse(issue)

            if self.create_response:
                issue.restrictedTraverse('create_response')()
                del self.request.response.headers['location']
                self.request.response.setStatus(200)

            res.update(self.getIssueInfos(issue))
            return res
        except Exception as e:
            return {'status': 'ko', 'message': e.args[0]}
