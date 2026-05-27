# Validation Summary: How to Use Ansible with Specific Python Interpreter Paths

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible inventory variables
- Ansible playbooks
- Ansible built-in modules: package, file, pip, stat, template, systemd, uri, setup, debug, hostname, lineinfile, service, command, fail, copy, cron
- Community Ansible modules: community.general.timezone, community.general.ufw
- Python virtual environments
- systemd service units
- SSH, UFW, cron, HTTP health checks

## Sources Consulted
- Ansible Interpreter Discovery: https://docs.ansible.com/projects/ansible/latest/reference_appendices/interpreter_discovery.html
- ansible.builtin.pip module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/pip_module.html
- ansible.builtin.stat module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/stat_module.html
- ansible.builtin.systemd_service module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- ansible.builtin.lineinfile module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/lineinfile_module.html
- community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible check mode and diff mode documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_checkmode.html

## Issues Found
- The installation playbook referenced `requirements_file.stat.exists` without first registering `requirements_file`. Added an `ansible.builtin.stat` task for `{{ app_dir }}/requirements.txt` before the conditional dependency installation task.
- The virtual environment task used `python3 -m venv`, which could bypass the interpreter path configured with `ansible_python_interpreter`. Changed it to `{{ ansible_python_interpreter }} -m venv` so the playbook uses the configured remote interpreter path.
- The infrastructure workflow used `ansible.builtin.timezone`, but current Ansible documentation lists the timezone module as `community.general.timezone`. Updated the FQCN accordingly.
- Removed the unused `python_version` variable because it was not connected to any interpreter path or task behavior.

## Review Notes
The examples use `community.general` modules, so users running only `ansible-core` need the `community.general` collection installed. The local review environment did not have Ansible installed, so command validation used current official Ansible documentation rather than local `ansible-playbook --help` or `ansible-doc` output.
