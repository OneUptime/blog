# Validation Summary: How to Install Python Packages with the Ansible pip Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.builtin.pip
- Python packaging
- pip
- virtual environments
- PEP 440 version specifiers
- PEP 668 externally managed environments
- systemd service management

## Sources Consulted
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pip_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- pip install command documentation: https://pip.pypa.io/en/stable/cli/pip_install/
- pip VCS support documentation: https://pip.pypa.io/en/stable/topics/vcs-support/
- Python Packaging User Guide, version specifiers: https://packaging.python.org/en/latest/specifications/version-specifiers/
- PEP 668: https://peps.python.org/pep-0668/

## Issues Found
- The post said the Ansible pip module uses whatever `pip` is available on the `PATH` by default. Ansible documents that the module shells out to pip and, by default, uses the pip version for the Ansible Python interpreter. Updated the wording and kept `executable` as the recommended override.
- The Git install example used the legacy `#egg=` fragment to tell pip the project name. Current pip documentation discourages that legacy form in favor of Direct URL requirement syntax. Updated the example to `mylib @ git+https://github.com/example/mylib.git@v2.0.0` and adjusted the explanation.
- The PEP 668 gotcha recommended passing `--break-system-packages` via `extra_args`. That pip flag exists, but current Ansible provides the `break_system_packages` module option. Updated the guidance to use `break_system_packages: true` on recent Ansible versions.
- The complete playbook used `ansible.builtin.systemd`, which currently redirects to `ansible.builtin.systemd_service`. Updated the handler examples to use the current FQCN directly.

## Review Notes
The remaining examples use valid Ansible pip parameters and pip options. The global install examples are technically valid on systems that allow global pip writes, but modern Linux distributions often require a virtualenv or explicit PEP 668 override.
