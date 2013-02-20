# -*- coding: utf-8 -*-
"""Installer for the collective.kanban package."""

from setuptools import find_packages
from setuptools import setup

import os.path


long_description = (
    open('README.rst').read()
    + '\n' +
    'Contributors\n'
    '============\n'
    + '\n' +
    open('CONTRIBUTORS.rst').read()
    + '\n' +
    open('CHANGES.rst').read()
    + '\n')


setup(
    name='collective.kanban',
    version='1.0',
    description="Kanban for POI tracker",
    long_description=long_description,
    # Get more from http://pypi.python.org/pypi?%3Aaction=list_classifiers
    classifiers=[
    	"Environment :: Web Environment",
        "Framework :: Plone",
        "Framework :: Plone :: 4.2.3",
        "Programming Language :: Python",
        "Programming Language :: Python :: 2.7",
    ],
    keywords='kanban poi',
    author='Vincent Fretin',
    author_email='vincentfretin@ecreall.com',
    url='http://pypi.python.org/pypi/collective.kanban',
    license='GPL',
    packages=find_packages('src', exclude=['ez_setup']),
    namespace_packages=['collective'],
    package_dir={'': 'src'},
    include_package_data=True,
    zip_safe=False,
    install_requires=[
        'five.grok',
        'plone.api',
        'setuptools',
    ],
    extras_require={
        'test': [
            'ecreall.helpers.testing',
            'plone.app.testing',
        ],
    },
    entry_points="""
    [z3c.autoinclude.plugin]
    target = plone
    """,
)