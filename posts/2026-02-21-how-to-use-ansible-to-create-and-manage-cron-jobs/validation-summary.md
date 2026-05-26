# Validation Summary: How to Use Ansible to Create and Manage Cron Jobs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.builtin.cron module
- Cron and crontab
- Linux scheduled task management
- YAML playbooks

## Sources Consulted
- Ansible documentation: ansible.builtin.cron module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html
- Linux crontab(5) manual page - https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found
- The post said that without a `name`, Ansible could not update or remove a cron entry and rerunning the task would create duplicates. The official Ansible documentation states that `name` is required as of ansible-core 2.12 and that changing the `name` creates a new cron task. Updated the wording to reflect the current required parameter behavior.
- The post listed `midnight` as an Ansible `special_time` alias for `daily`. The official Ansible module choices are `annually`, `daily`, `hourly`, `monthly`, `reboot`, `weekly`, and `yearly`. Removed the unsupported `midnight` alias.
- The quick reference diagram listed Ansible weekday values as `0-7`. The official Ansible module documentation lists `weekday` values as `SUN-SAT` or `0-6`. Updated the diagram to `0-6`.

## Review Notes
The examples use the fully qualified `ansible.builtin.cron` module name, which matches current Ansible documentation. The `cron_file` removal example correctly omits `user` because Ansible requires `user` with `cron_file` unless `state=absent`.
