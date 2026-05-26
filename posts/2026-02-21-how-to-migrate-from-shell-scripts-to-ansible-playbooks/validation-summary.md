# Validation Summary: How to Migrate from Shell Scripts to Ansible Playbooks

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Ansible playbooks
- Ansible built-in modules
- Ansible community collections
- Shell scripting
- SSH
- systemd services
- Debian/Red Hat package management
- PostgreSQL backup automation

## Sources Consulted
- Ansible built-in module index: https://docs.ansible.com/projects/ansible/latest/collections/index_module.html
- Ansible playbook strategies and run_once behavior: https://docs.ansible.com/ansible/3/user_guide/playbooks_strategies.html
- Ansible playbook keywords: https://docs.ansible.com/projects/ansible/latest/reference_appendices/playbooks_keywords.html
- ansible.builtin.git module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html
- ansible.builtin.pip module: https://docs.ansible.com/projects/ansible-core/2.19/collections/ansible/builtin/pip_module.html
- ansible.builtin.apt module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html
- ansible.builtin.file module: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/file_module.html
- ansible.builtin.script module: https://docs.ansible.com/projects/ansible-core/devel/collections/ansible/builtin/script_module.html
- ansible.builtin.command module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/command_module.html
- ansible.builtin.uri module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- community.general.archive module: https://docs.ansible.com/projects/ansible/latest/collections/community/general/archive_module.html
- community.postgresql.postgresql_db module: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_db_module.html

## Issues Found
- The deployment example used `run_once: true` with `serial: "25%"` for database migrations. Ansible documents that `run_once` runs once per serial batch, so the migration could run more than once during a rolling deploy. Added `when: inventory_hostname == ansible_play_hosts_all[0]` to make the migration task run once for the whole play.
- The file operation translation set `recurse: yes` on `/opt/myapp/logs`, which did not match the shell example's ownership change on `/opt/myapp` and could imply recursively setting mode only under the logs directory. Split the example into tasks that create `/opt/myapp`, recursively set ownership on `/opt/myapp`, and create `/opt/myapp/logs` with the intended mode.
- The backup compression example used `ansible.builtin.archive`, but current Ansible documentation lists the archive module under `community.general.archive`, not `ansible.builtin`. Updated the FQCN.
- The surrounding text said to use command/shell as a migration bridge while the example used `ansible.builtin.script`. Updated the sentence to include script, command, or shell.

## Review Notes
The examples are generally valid as illustrative migrations, but real production playbooks should define variables such as `app_repo`, `app_version`, and `db_name`, ensure required collections such as `community.general` and `community.postgresql` are installed, and account for application-specific migration idempotency and rollback behavior.
