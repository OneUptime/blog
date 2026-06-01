# Validation Summary: How to Set Up Azure Artifacts Python Feeds with pip and twine

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Azure Artifacts Python feeds
- Azure DevOps and Azure Pipelines
- pip
- twine
- artifacts-keyring and keyring
- Python packaging with pyproject.toml, setuptools, wheel, and build
- PEP 440 versioning
- Docker multi-stage builds and BuildKit secrets

## Sources Consulted
- Microsoft Learn: Consume packages from PyPI with Azure Artifacts - https://learn.microsoft.com/en-us/azure/devops/artifacts/python/use-packages-from-pypi?view=azure-devops
- Microsoft Learn: Publish Python packages (CLI) - https://learn.microsoft.com/en-us/azure/devops/artifacts/quickstarts/python-cli?view=azure-devops
- Microsoft Learn: TwineAuthenticate@1 task reference - https://learn.microsoft.com/en-us/azure/devops/pipelines/tasks/reference/twine-authenticate-v1?view=azure-pipelines
- Microsoft Learn: Publish Python packages with Azure Pipelines - https://learn.microsoft.com/en-us/azure/devops/pipelines/artifacts/pypi?view=azure-devops
- Microsoft artifacts-keyring README - https://github.com/microsoft/artifacts-keyring
- pip documentation: Configuration - https://pip.pypa.io/en/stable/topics/configuration/
- pip documentation: Authentication - https://pip.pypa.io/en/stable/topics/authentication/
- Python Packaging User Guide: Writing your pyproject.toml - https://packaging.python.org/en/latest/guides/writing-pyproject-toml/
- Python Packaging User Guide: Packaging Python Projects - https://packaging.python.org/en/latest/tutorials/packaging-projects/
- Python Packaging User Guide: Version specifiers / developmental releases - https://packaging.python.org/en/latest/specifications/version-specifiers/
- Docker Docs: Build secrets - https://docs.docker.com/build/building/secrets/
- Docker Docs: Build variables - https://docs.docker.com/build/building/variables/

## Issues Found
- The `artifacts-keyring` installation command did not include `keyring`, while current Microsoft Azure Artifacts guidance installs both packages for pip authentication. Updated the command to `pip install keyring artifacts-keyring`.
- The `pyproject.toml` example used `setuptools.backends._legacy:_Backend`, which is not the current documented setuptools PEP 517 backend and is not importable in the local Python 3.12 environment. Changed it to `setuptools.build_meta`.
- The pipeline ran `pytest --cov` and `flake8`, but the example `dev` extra only installed `pytest` and `black`. Added `pytest-cov` and `flake8` to the `dev` optional dependencies so the pipeline commands have their required tools.
- The `TwineAuthenticate@1` example used only the feed name in `artifactFeed`, which is correct for organization-scoped feeds but not project-scoped feeds. Updated the example to use `$(System.TeamProject)/$(feedName)` and noted that organization-scoped feeds can use just `$(feedName)`.
- The Docker example passed the PAT as a build argument, but Docker documentation states that build arguments are inappropriate for secrets. Replaced the PAT build argument with a BuildKit secret mount and updated the build command accordingly.

## Review Notes
The post is technically relevant and valid after the fixes above. The examples still use placeholder organization, project, feed, and package names, so readers must replace them with their own Azure DevOps values.
