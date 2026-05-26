# Validation Summary: How to Fix Ansible conditional check failed Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Ansible playbooks
- Ansible conditionals and `when` clauses
- Jinja2 expressions, tests, and filters
- YAML playbook syntax
- Ansible modules including `command`, `systemd`, `package`, `community.general.timezone`, `hostname`, `lineinfile`, `community.general.ufw`, `template`, `uri`, `fail`, `copy`, `file`, and `cron`

## Sources Consulted
- Ansible conditionals documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_conditionals.html
- Ansible variables and registered variables documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_variables.html
- Ansible `ansible.builtin.systemd` redirect and `ansible.builtin.systemd_service` documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_module.html and https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible `community.general.timezone` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible `community.general.ufw` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible `ansible.builtin.uri` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.cron` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Ansible `ansible.builtin.hostname` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/hostname_module.html
- Ansible `ansible.builtin.command`, `package`, and `copy` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/package_module.html, and https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html

## Issues Found
- The registered-variable example said a skipped registered task makes the variable undefined. Current Ansible documentation says failed or skipped tasks still register a status object except when skipped by tags. I changed the text to distinguish an undefined variable from a skipped result that lacks an `rc` attribute, and updated the fixed condition to check both `nginx_status` and `nginx_status.rc`.
- The infrastructure provisioning example used `ansible.builtin.timezone`, but the current documented FQCN is `community.general.timezone`. I updated the module name.
- The fallback error-handling example intended to report and fail explicitly if both commands failed, but the fallback command would stop the play on failure before the later tasks could run. I added `failed_when: false` to the fallback command.
- The scheduled scan example copied a script into `/opt/scripts` without ensuring the parent directory exists. I added a directory task using `ansible.builtin.file`.

## Review Notes
The `ansible.builtin.systemd` name is still accepted as a compatibility redirect to `ansible.builtin.systemd_service`; the short `systemd` example remains valid. The use-case examples assume required collections such as `community.general` are installed and that paths such as `/opt/ansible` exist in the target environment.
