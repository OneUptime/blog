# Validation Summary: How to Install Ansible Using pip in a Python Virtual Environment

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible-core
- Python
- pip
- Python virtual environments
- Linux package managers
- Homebrew

## Sources Consulted
- Ansible installation documentation: https://docs.ansible.com/projects/ansible/latest/installation_guide/intro_installation.html
- Ansible release and maintenance support matrix: https://docs.ansible.com/projects/ansible-core/devel/reference_appendices/release_and_maintenance.html
- Python venv documentation: https://docs.python.org/3/library/venv.html
- pip index command documentation: https://pip.pypa.io/en/stable/cli/pip_index/
- Ansible inventory documentation: https://docs.ansible.com/projects/ansible/latest/inventory_guide/intro_inventory.html
- Homebrew Python documentation: https://docs.brew.sh/Homebrew-and-Python
- Red Hat Enterprise Linux Python documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/installing_and_using_dynamic_programming_languages/
- PyPI package metadata checked with `pip index versions` and wheel metadata for `ansible`, `ansible-core`, `ansible-lint`, and `molecule`.

## Issues Found
- The prerequisites said Python 3.9 or later was sufficient. Current `ansible` 13.x and `ansible-core` 2.20/2.21 require Python 3.12 or later on the control node, so the prerequisite was updated to require a supported Python version and to call out Python 3.12+ for current releases.
- The macOS Homebrew command used `brew install python3`. Homebrew documents the main Python formula as `python`, so the command was changed to `brew install python`.
- The CentOS/RHEL prerequisite command installed `python3-virtualenv`, but the tutorial uses the standard-library `venv` module and current Ansible requires a newer Python than RHEL 9's default Python 3.9. The command was updated to install Python 3.12 and its pip package, with a note to use `python3.12` where that is the interpreter name.
- The version pinning examples used older Ansible 9 and ansible-core 2.16 versions, which are no longer current. They were updated to `ansible==13.7.0` and `ansible-core==2.20.6`.
- The sample `requirements.txt` used older `ansible`, `ansible-lint`, and `molecule` pins. These were updated to current available package versions checked through pip.
- The multiple-version examples used Ansible 8.x and 9.x. These examples were updated to Ansible 12.x and 13.x so they remain plausible for current project migration scenarios.
- The upgrade and rollback examples used old Ansible 9.x versions. They were updated to current Ansible 13.x versions.

## Review Notes
The commands and snippets are otherwise technically correct for a POSIX shell with an activated virtual environment. Ansible's official docs also recommend `pipx` on systems where direct pip installs are restricted by the OS, but the post's virtual environment workflow remains valid.
