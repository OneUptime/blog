# Validation Summary: How to Set Up Python Virtual Environments with venv on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Python 3.9, 3.11, and 3.12
- Python `venv`
- pip
- Bash shell activation
- `requirements.txt`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Installing and using Python": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_installing-and-using-python_installing-and-using-dynamic-programming-languages
- Python documentation, `venv` module: https://docs.python.org/3/library/venv.html
- Python Packaging User Guide, "Install packages in a virtual environment using pip and venv": https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/
- pip documentation, `pip freeze`: https://pip.pypa.io/en/latest/cli/pip_freeze/
- Python documentation, `ensurepip`: https://docs.python.org/3/library/ensurepip.html

## Issues Found
- The installation section said the `venv` module might not be installed by default and showed `python3-pip` and `python3.11-pip` as installing "venv support." RHEL 9 documents `python3.9`, `python3.11`, and `python3.12` as the interpreter packages and their matching pip packages as `python3.9-pip`, `python3.11-pip`, and `python3.12-pip`. I changed the text to describe installing the matching Python and pip packages, and updated the commands accordingly.
- The `--system-site-packages` example used `pip install --user somepackage` and said it installs only in the venv. That is incorrect: `--user` targets the user site, not the virtual environment. I changed the example to `pip install somepackage`, which installs into the active venv.

## Review Notes
The remaining commands and explanations are consistent with the Python and PyPA documentation. `pip freeze` records installed package versions in requirements format; it is useful for recreating an environment, but it is not a full dependency lock solver.
