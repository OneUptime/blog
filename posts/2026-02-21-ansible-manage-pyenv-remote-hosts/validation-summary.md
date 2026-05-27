# Validation Summary: How to Use Ansible to Manage pyenv on Remote Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and built-in modules
- pyenv and python-build
- Python virtual environments
- systemd service units
- UFW firewall configuration
- cron scheduling

## Sources Consulted
- Ansible `ansible.builtin.pip` module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/pip_module.html
- Ansible `ansible.builtin.git` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible `ansible.builtin.systemd_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- pyenv README and usage documentation: https://github.com/pyenv/pyenv
- pyenv python-build documentation: https://github.com/pyenv/pyenv/blob/master/plugins/python-build/README.md

## Issues Found
- The main playbook did not install or configure pyenv even though the post title and description were about managing pyenv. I replaced the generic system Python virtual environment setup with tasks that install pyenv from the official repository, install an exact Python version with `pyenv install`, set the pyenv global version file, and create the application virtual environment from the pyenv-managed interpreter.
- The playbook referenced `requirements_file.stat.exists` without registering `requirements_file`. I added an `ansible.builtin.stat` task before the conditional pip install.
- The Python version was specified as `"3.11"`, which pyenv can resolve as a prefix but is less reproducible than an exact release. I changed it to `"3.11.8"` so the playbook installs a specific interpreter.
- The dependency list was incomplete for building CPython with pyenv/python-build on Debian-family systems. I added common build dependencies such as `git`, `curl`, `zlib1g-dev`, `libbz2-dev`, `libreadline-dev`, `libsqlite3-dev`, `xz-utils`, `tk-dev`, `libxml2-dev`, `libxmlsec1-dev`, and `liblzma-dev`.
- The virtual environment task used `state: latest` for pip while the summary claimed repeatable idempotent behavior. I changed it to `state: present` and softened the summary to say the tasks are designed to avoid unnecessary changes.
- The common-use-cases text referred to "this module" even though the post is not about a single Ansible module. I changed those references to "pattern" or "patterns."
- The SSH service handler used `sshd`, which is not the default service name on Debian/Ubuntu-style hosts implied by the package names. I changed it to `ssh`.

## Review Notes
- The package names in the pyenv dependency task are Debian/Ubuntu-oriented. The playbook uses `ansible.builtin.package`, but equivalent package names would still be needed for RHEL, Fedora, Alpine, or macOS targets.
- `ansible.builtin.systemd` remains a documented backward-compatible alias for `ansible.builtin.systemd_service`; the examples are still technically valid.
- The pyenv checkout tracks `master`, which is simple for a tutorial but less reproducible than pinning a release tag in production.
