# Validation Summary: How to Use the changed_when Directive in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `changed_when` and `failed_when` conditionals
- Ansible `command`, `shell`, `template`, and `systemd` modules
- Handlers and task change reporting
- Supporting CLI examples: `git`, `rsync`, `pip`, `docker`, `timedatectl`

## Sources Consulted
- Ansible official documentation on defining changed status and `changed_when`: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_error_handling.html#defining-changed
- Ansible official documentation for `ansible.builtin.command`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible official documentation for `ansible.builtin.shell`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible official documentation on handlers and task change notifications: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_handlers.html
- Ansible official documentation for `ansible.builtin.systemd_service` / `systemd` alias: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html
- Ansible official documentation for `ansible.builtin.template`: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/template_module.html
- rsync official man page for `--itemize-changes`: https://rsync.samba.org/ftp/rsync/rsync.1.html

## Issues Found
1. **Overstated `command` and `shell` change behavior**: The post said `command` and `shell` always report changed. Ansible's modules can be guarded with options such as `creates` and `removes`, so this was narrowed to say they report changed by default when they run.
2. **Timezone example checked state after applying the change**: The original example ran `timedatectl set-timezone UTC` before checking the current timezone and also forced the setter task to report unchanged. Reordered the tasks so the timezone is checked first and the setter runs only when the current timezone is not UTC.
3. **rsync example could report false changes**: The original `rsync -av --checksum` example checked for the standard verbose header and line count, which can be present even when no files changed. Updated it to use `rsync -ai --checksum` and detect itemized change lines.
4. **Git example claimed clone-or-update behavior**: The command used `git clone`, which does not update an existing repository. Changed the pattern label and task name to describe cloning only when the repository is missing.

## Review Notes
- The core explanation of `changed_when`, registered result variables, implicit `and` behavior for list conditions, and handler notification behavior matches the official Ansible documentation.
- The examples use short module names such as `command`, `shell`, `template`, and `systemd`, which remain valid. Ansible documentation recommends fully qualified collection names for linking and disambiguation, but the short names are still supported.
- Ansible was not installed in the local workspace, so validation used official documentation and local CLI help where available rather than `ansible-playbook --syntax-check`.
