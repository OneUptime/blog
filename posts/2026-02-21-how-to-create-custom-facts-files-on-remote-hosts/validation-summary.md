# Validation Summary: How to Create Custom Facts Files on Remote Hosts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible local facts and `facts.d`
- `ansible.builtin.setup`
- `ansible.builtin.file`
- `ansible.builtin.copy`
- `ansible.builtin.template`
- `ansible.builtin.cron`
- YAML, JSON, INI, Jinja2, and Bash fact scripts

## Sources Consulted
- Ansible documentation: Discovering variables, facts, and local facts: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_vars_facts.html
- Ansible documentation: `ansible.builtin.setup` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/setup_module.html
- Ansible documentation: `ansible.builtin.file` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/file_module.html
- Ansible documentation: `ansible.builtin.copy` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible documentation: `ansible.builtin.template` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible documentation: `ansible.builtin.cron` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The final cron example used `special_time: reboot` while describing a reboot scheduled during a maintenance window. In Ansible's cron module, `special_time: reboot` maps to cron's `@reboot` behavior, which runs at system startup rather than at a calendar maintenance window. I changed the example to schedule the command at 02:00 on Sunday and added a condition matching the example `host_metadata.maintenance_window` value.
- The final playbook wrote to `/etc/prometheus/rules/host-alerts.yml` and configured a reboot command without privilege escalation. I added `become: yes` to make the example consistent with the privileged paths and system administration tasks it performs.

## Review Notes
- The core custom facts guidance is accurate: Ansible uses `/etc/ansible/facts.d` by default, requires `.fact` file names, supports JSON, INI, and executable files that return JSON, stores POSIX local facts under `ansible_local`, and requires an explicit `setup` run if facts are created and consumed in the same play.
- Static JSON and INI examples correctly use non-executable file modes. Executable fact scripts correctly use an executable mode.
- Ansible was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `ansible-playbook`.
