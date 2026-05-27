# Validation Summary: How to Use Ansible to Deploy Python Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules: apt, file, git, pip, stat, template, uri, systemd_service, setup, debug, timezone, hostname, lineinfile, service, command, fail, copy, cron
- community.general.ufw
- Python virtual environments and pip requirements files
- systemd service units
- SSH inventory configuration
- Cron scheduling

## Sources Consulted
- Ansible apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible git module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- Ansible pip module documentation: https://docs.ansible.com/projects/ansible-core/2.16/collections/ansible/builtin/pip_module.html
- Ansible stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- Ansible systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible check and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- systemd service unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html

## Issues Found
- The playbook referenced `requirements_file.stat.exists` without first registering `requirements_file`. Added a `stat` task for `{{ app_dir }}/requirements.txt` before the pip requirements task.
- The description says the post covers code checkout, but the main playbook did not check out application code before using files under `app_dir`. Added `app_repo`, `app_version`, and an `ansible.builtin.git` checkout task.
- The dependency list used Debian/Ubuntu package names with the generic `package` module, which could imply cross-distribution portability that the package names do not provide. Changed the example to `ansible.builtin.apt` and clarified the task name as Debian/Ubuntu-specific.
- The examples used `ansible.builtin.systemd`, which is a backward-compatible alias for the renamed `ansible.builtin.systemd_service` module. Updated the examples to the current module name.
- The infrastructure provisioning example used `community.general.ufw` without installing the `ufw` package. Added `ufw` to the required packages list.

## Review Notes
- The `community.general.ufw` module is part of the `community.general` collection, not `ansible-core`; environments using only `ansible-core` need that collection installed.
- The service template assumes the application can run with `python -m {{ app_name }}` and exposes `http://localhost:8000/health`; those values are application-specific and should be adjusted for real deployments.
- The local review environment did not have `ansible-playbook` installed, so command behavior was checked against official documentation rather than local CLI help.
