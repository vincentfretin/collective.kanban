# -*- coding: utf-8 -*-
"""Setup/installation tests for this package."""

from collective.kanban.testing import IntegrationTestCase
from plone import api


class TestInstall(IntegrationTestCase):
    """Test installation of collective.kanban into Plone."""

    def setUp(self):
        """Custom shared utility setup for tests."""
        self.portal = self.layer['portal']
        self.installer = api.portal.get_tool('portal_quickinstaller')

    def test_product_installed(self):
        """Test if collective.kanban is installed with portal_quickinstaller."""
        self.assertTrue(self.installer.isProductInstalled('collective.kanban'))

    def test_uninstall(self):
        """Test if collective.kanban is cleanly uninstalled."""
        self.installer.uninstallProducts(['collective.kanban'])
        self.assertFalse(self.installer.isProductInstalled('collective.kanban'))

    # browserlayer.xml
    def test_browserlayer(self):
        """Test that ICollectiveKanbanLayer is registered."""
        from collective.kanban.interfaces import ICollectiveKanbanLayer
        from plone.browserlayer import utils
        self.failUnless(ICollectiveKanbanLayer in utils.registered_layers())
