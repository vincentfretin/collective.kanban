=================
collective.kanban
=================

Kanban for Poi tracker.

It adds a Kanban link on top of the tracker.

Tested manually on Firefox 17, Chrome 20, IE 9, Opera 12, Safari 6

The kanban has the following features:

- Show dynamically releases, areas and states corresponding to the query made.
  If the view is called without state parameter, show only active states.
- Areas and releases are clickable to expand/retract.
- Drag and drop a issue in a different state, area or release.
  The allowed transition check is done client side (and server side of course),
  to prevent unnecessary requests to the server.
- Allow select and drag several issues in the same column with ctrl and shift keys.
- Allow to drag and drop from a different window.
  The allowed transition check is not done client side.
  The dragged issues are removed if the drop was successful server side.
  It works with a storage event (localStorage).

On page load and on issue drop, some informations are updated (This is not used in default Poi tracker):

- On each column is calculated the sum of the complexity of issues in this column. The same for area.
- For the release, total of issues, complexity sum, and a progress bar:
  in green the percent of issues done, in orange percent of issues in progress, and grey no started.
