# Validation Summary: How to Use Ansible to Migrate Servers to New Hardware

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules
- ansible.posix synchronize / rsync
- community.general modules
- Linux service management with systemd
- UFW firewall configuration
- Cron scheduling

## Sources Consulted
- Ansible ansible.posix.synchronize module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/posix/synchronize_module.html
- Ansible ansible.builtin.include_role module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_role_module.html
- Ansible ansible.builtin.apt module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- Ansible ansible.builtin.systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible community.general.ufw module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/ufw_module.html
- Ansible ansible.builtin.copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- Ansible ansible.builtin.command module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible tags documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_tags.html

## Issues Found
- `migration_rsync_opts` was defined as a single string, but `synchronize.rsync_opts` expects a list of strings. Changed the default to a YAML list and left archive/compression behavior to the module defaults.
- The `include_role` example used `delegate_to` at the task level, which does not apply that keyword to tasks inside the included role. Added `apply.delegate_to` so the baseline role tasks run against the target host.
- The remote-to-remote `synchronize` examples used a local path as `dest`, which would sync to the current inventory host rather than explicitly to the migration target. Updated the destination to `{{ migration_target_host }}:<path>`.
- The timezone example used `ansible.builtin.timezone`, but the current supported module is `community.general.timezone`. Updated the module name.
- The fallback command in the error-handling example could fail the play before the final explicit failure task ran. Added `failed_when: false` to preserve the intended control flow.
- The scheduled scan example copied `/opt/scripts/compliance_scan.sh` without ensuring `/opt/scripts` exists. Added a directory creation task before the copy task.

## Review Notes
The examples remain illustrative and assume supporting variables such as `source_packages`, `source_users`, and collection dependencies are defined elsewhere. The rollback description is appropriate for a simple cutover before accepting writes on the new target, but more complex stateful applications may require application-specific rollback handling.
