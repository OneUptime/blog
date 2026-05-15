# Validation Summary: How to Install and Configure pip on RHEL Without Breaking System Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Python 3.9, 3.11, and 3.12
- pip
- Python virtual environments
- pipx
- pip configuration
- pip-audit
- DNF and RPM-managed Python packages

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Installing and using Python: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_installing-and-using-python_installing-and-using-dynamic-programming-languages
- Red Hat Enterprise Linux 9 documentation: Introduction to Python: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/assembly_introduction-to-python_installing-and-using-dynamic-programming-languages
- pip documentation: Configuration: https://pip.pypa.io/en/stable/topics/configuration/
- pip documentation: pip config: https://pip.pypa.io/en/stable/cli/pip_config/
- pip documentation: pip install: https://pip.pypa.io/en/stable/cli/pip_install/
- PyPA specification / PEP 668: Externally Managed Environments: https://packaging.python.org/en/latest/specifications/externally-managed-environments/
- pipx documentation: Installation and path configuration: https://pipx.pypa.io/latest/installation/ and https://pipx.pypa.io/stable/how-to/configure-paths/
- Fedora EPEL package listing for pipx on EL9: https://packages.fedoraproject.org/pkgs/pipx/pipx/epel-9.html
- pip-audit project documentation: https://pypi.org/project/pip-audit/

## Issues Found
- The post incorrectly said RHEL 9 blocks `pip install` outside a virtual environment by default with an `EXTERNALLY-MANAGED` marker. Current Red Hat RHEL 9 documentation warns against root/system-level pip installs and recommends virtual environments or non-root `--user` installs; it does not describe RHEL 9 pip as blocked by PEP 668 by default. I revised the policy explanation, diagram, error section, and summary to match Red Hat guidance.
- The default Python 3.9 pip install command used `python3-pip`. Current Red Hat documentation lists `python3.9-pip` for Python 3.9, so I updated the command.
- The sample pip configuration set `user = true` globally while also recommending virtual environments. A global user install setting can interfere with normal virtual environment installs, so I removed it and added a note not to set it globally when using venvs.
- The private index example appended a second `[global]` section to the same `pip.conf`, which is a poor and potentially invalid config example. I replaced it with `python3 -m pip config set` commands from the official pip config interface.
- The pipx section implied `pipx` is directly available from base RHEL repositories and used the older Linux venv path. I clarified that `pipx` must come from an enabled repository such as EPEL and updated the venv path to `~/.local/share/pipx/venvs/`.
- The `--extra-index-url` example did not mention dependency confusion risk for private packages. I added a short caution aligned with the pip documentation warning.

## Review Notes
The post is now accurate for RHEL 9 as documented on May 15, 2026. RHEL 10 and Fedora may differ because PEP 668 adoption and Python defaults vary by distribution and release.
