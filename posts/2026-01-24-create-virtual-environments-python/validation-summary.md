# Validation Summary: How to Create Virtual Environments in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- venv
- pip
- requirements.txt
- virtualenv
- conda
- VS Code Python extension
- PyCharm
- Git ignore files

## Sources Consulted
- Python `venv` documentation: https://docs.python.org/3/library/venv.html
- Python Packaging User Guide, "Install packages in a virtual environment using pip and venv": https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/
- pip `install` documentation: https://pip.pypa.io/en/stable/cli/pip_install/
- pip `freeze` documentation: https://pip.pypa.io/en/stable/cli/pip_freeze/
- pip requirement specifiers documentation: https://pip.pypa.io/en/stable/reference/requirement-specifiers/
- virtualenv command-line documentation: https://virtualenv.pypa.io/en/stable/reference/cli.html
- conda managing environments documentation: https://docs.conda.io/projects/conda/en/latest/user-guide/tasks/manage-environments.html
- VS Code Python settings reference: https://code.visualstudio.com/docs/python/settings-reference
- VS Code Python environments documentation: https://code.visualstudio.com/docs/python/environments
- JetBrains PyCharm interpreter documentation: https://www.jetbrains.com/help/pycharm/configuring-python-interpreter.html

## Issues Found
- The post said users "must" activate a virtual environment before using it. Python's `venv` documentation states activation is optional when using the environment's Python interpreter or installed scripts by explicit path. Changed the wording to say activation is needed before using unqualified `python` and `pip` commands.
- The post listed relocatable environments as a reason to choose `virtualenv`. Current `virtualenv` CLI documentation no longer lists relocatable environment support, and Python's `venv` documentation warns that virtual environments are generally non-portable. Replaced that bullet with current `virtualenv` features: interpreter discovery and configurable seed packages.
- The VS Code `python.defaultInterpreterPath` example used a Unix-specific interpreter path. VS Code's Python settings documentation recommends pointing at the environment folder for a platform-neutral workspace setting. Changed the example to `${workspaceFolder}/venv`.

## Review Notes
- The conda section uses traditional `conda env export` and `conda env create -f environment.yml`, which still work. Current conda documentation now recommends `conda export` and notes that `conda env create --file` is retained for backward compatibility, so a future refresh could modernize those examples.
- The post's examples use `pip` directly after activation. This is valid, though `python -m pip` is often preferred in documentation because it makes the target interpreter explicit.
