# Validation Summary: How to Set Up Python Virtual Environments (venv) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu package management with apt
- Python 3
- Python venv
- pip and requirements files
- pip constraints files
- pip-tools
- pyenv and pyenv-virtualenv
- virtualenvwrapper
- Conda and environment.yml
- Visual Studio Code Python extension settings
- Python project structure and .gitignore conventions

## Sources Consulted
- Python venv documentation: https://docs.python.org/3/library/venv.html
- pip user guide, including requirements and constraints files: https://pip.pypa.io/en/stable/user_guide/
- pip requirements file format: https://pip.pypa.io/en/stable/reference/requirements-file-format/
- pip freeze command reference: https://pip.pypa.io/en/stable/cli/pip_freeze/
- Python Packaging User Guide, externally managed environments: https://packaging.python.org/en/latest/specifications/externally-managed-environments/
- pyenv README: https://github.com/pyenv/pyenv
- virtualenvwrapper installation documentation: https://virtualenvwrapper.readthedocs.io/en/latest/install.html
- Ubuntu virtualenvwrapper package metadata and package contents from apt/dpkg
- Conda environment management documentation: https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html
- VS Code Python settings reference: https://code.visualstudio.com/docs/python/settings-reference
- VS Code Python linting documentation: https://code.visualstudio.com/docs/python/linting
- VS Code Python formatting documentation: https://code.visualstudio.com/docs/python/formatting

## Issues Found
- The deactivation verification used `which python`, but Ubuntu systems may not provide a `python` command outside a virtual environment. Changed it to `which python3`, matching the expected system interpreter command.
- The editable-install filtering example used `pip freeze | grep -v "^-e"`. Replaced it with pip's official `pip freeze --exclude-editable` option.
- The virtualenvwrapper section used a global `pip3 install` workflow and `/usr/local/bin/virtualenvwrapper.sh`, which is unreliable on current Ubuntu systems with externally managed Python installations and does not match the Ubuntu package path. Changed it to install `virtualenvwrapper` with apt and source `/usr/share/virtualenvwrapper/virtualenvwrapper.sh`.
- The Conda `environment.yml` example had a `pip:` subsection without listing `pip` as an explicit conda dependency. Added `- pip`, following Conda guidance for mixed conda/pip environments.
- The VS Code workspace settings used deprecated `python.linting.*` and `python.formatting.provider` settings. Removed the deprecated linting settings and replaced the formatter configuration with the current `[python].editor.defaultFormatter` pattern for the Black Formatter extension.

## Review Notes
The remaining commands and examples are technically sound for a general Ubuntu Python virtual environment tutorial. Some pinned package versions in examples may become stale over time, but they are illustrative and not technically incorrect.
