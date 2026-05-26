# Validation Summary: How to Use become and become_user for Privilege Escalation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible privilege escalation with `become`
- Ansible become plugins and methods (`sudo`, `su`, `pbrun`, `pfexec`)
- Ansible configuration via `ansible.cfg`
- Linux sudoers configuration
- Ansible built-in modules including `apt`, `systemd`, `template`, `file`, `get_url`, `unarchive`, `pip`, `user`, `command`, and `debug`

## Sources Consulted
- Ansible Community Documentation: Understanding privilege escalation: become - https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_privilege_escalation.html
- Ansible Community Documentation: Become plugins - https://docs.ansible.com/projects/ansible/latest/plugins/become.html
- Ansible Community Documentation: Ansible Configuration Settings - https://docs.ansible.com/projects/ansible/latest/reference_appendices/config.html
- Ansible Community Documentation: ansible.builtin.template module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/template_module.html
- Ansible Community Documentation: ansible.builtin.get_url module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/get_url_module.html
- Ansible Community Documentation: ansible.builtin.unarchive module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/unarchive_module.html
- Ansible Community Documentation: ansible.builtin.systemd_service module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The `become_user` example said "We need root first to switch to other users." Ansible's directives are independent and `become_user` selects the target user for privilege escalation; it does not mean Ansible first becomes root. Updated the comment to say privilege escalation is enabled for tasks that switch users.
- The app-user template task set `owner` and `group` while running as `appuser`. The template module applies ownership as a `chown` operation, which normally requires root privileges. Removed `owner` and `group` from that non-root task while keeping the mode setting.
- The multi-user deployment example downloaded into `{{ app_dir }}/releases` and extracted into `{{ app_dir }}/current` without creating those directories first. The `unarchive` module requires `dest` to already exist, and `get_url` needs the parent directory to exist for a file destination. Added a file task to create both directories with the application user's ownership.
- The `become_flags: '-H -S'` comment described `-H` as preserving `HOME`. For sudo, `-H` sets `HOME` to the target user's home directory. Updated the comment.

## Review Notes
The examples use short module names such as `apt`, `systemd`, and `template`, which remain valid. Current Ansible documentation recommends fully qualified collection names for easier linking and to avoid name conflicts, but this is a recommendation rather than a correctness issue.
