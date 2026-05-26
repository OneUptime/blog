# Validation Summary: How to Use Ansible to Manage Supervisor Processes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- Supervisor and supervisorctl
- systemd
- Jinja2 templates
- Python application process management

## Sources Consulted
- Ansible community.general.supervisorctl module documentation: https://docs.ansible.com/projects/ansible/12/collections/community/general/supervisorctl_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Supervisor configuration file documentation: https://supervisord.org/configuration.html
- Supervisor supervisorctl command documentation: https://supervisord.org/running.html

## Issues Found
- The Supervisor program template rendered environment variables as quoted whole `KEY=value` strings instead of Supervisor's documented `KEY="value"` format. Updated the Jinja2 template to render each environment entry as `KEY="value"` and escape percent signs for Supervisor's interpolation rules.
- The `numprocs` example used one rotated stdout/stderr log file for multiple process instances. Supervisor documents that multiple processes must not share a rotated log file because it can corrupt the log. Updated the template to include `%(process_num)02d` in log file names when `numprocs` is greater than 1.
- Several handlers used `ansible.builtin.command: supervisorctl reread && supervisorctl update`. The Ansible command module does not process shell metacharacters such as `&&`. Replaced those with `ansible.builtin.command: supervisorctl update`, which Supervisor documents as reloading config and applying add/remove changes.
- The handler example used `community.general.supervisorctl` with `state: present` and described it as running `reread + update`. The Ansible module documentation says `state=present` runs `reread` and `add` when the program/group is missing. Replaced the handler with `supervisorctl update` to match the intended behavior.

## Review Notes
- The `community.general.supervisorctl` module is part of the `community.general` collection, not `ansible-core`; environments using only `ansible-core` must install the collection separately.
- The `stderr_logfile` setting is ignored by Supervisor when `redirect_stderr=true`; the example remains valid, but future revisions could conditionally omit stderr log settings when stderr is redirected.
