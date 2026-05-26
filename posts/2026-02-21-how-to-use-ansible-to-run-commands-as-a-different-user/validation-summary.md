# Validation Summary: How to Use Ansible to Run Commands as a Different User

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible privilege escalation (`become`, `become_user`, `become_method`)
- Ansible playbooks, tasks, blocks, and modules
- PostgreSQL command-line administration (`createdb`, `psql`, `pg_dump`)
- sudo privilege listing and user switching

## Sources Consulted
- Ansible documentation: Understanding privilege escalation, https://docs.ansible.com/ansible/latest/user_guide/become.html
- Ansible documentation: ansible.builtin.command module, https://docs.ansible.com/ansible/latest/collections/ansible/builtin/command_module.html
- Ansible documentation: Blocks, https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_blocks.html
- Ansible documentation: ansible.builtin.sudo become plugin, https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/sudo_become.html
- PostgreSQL documentation: createdb, https://www.postgresql.org/docs/current/app-createdb.html
- PostgreSQL documentation: psql, https://www.postgresql.org/docs/current/app-psql.html
- PostgreSQL documentation: CREATE USER, https://www.postgresql.org/docs/current/sql-createuser.html
- Local sudo help output for `sudo -l -U` syntax.

## Issues Found
- The post said that adding `become_user` makes Ansible escalate to root first and then switch to the target user. This was too specific and not generally accurate. Ansible uses the configured become method to run as the target user, and with sudo that is commonly done with `sudo -u`. Updated the wording to match Ansible's documented behavior.
- The summary said `become_user` requires `become: yes` because Ansible must escalate privileges first before switching users. The important documented point is that `become_user` does not imply `become`. Updated the wording to avoid implying an always-root intermediate step.

## Review Notes
- All YAML code blocks parsed successfully.
- The Ansible examples use current FQCN module names such as `ansible.builtin.command`, `ansible.builtin.shell`, and `ansible.builtin.systemd`.
- The PostgreSQL examples are syntactically plausible, but production playbooks would usually prefer idempotent collection modules such as `community.postgresql.postgresql_db` and `community.postgresql.postgresql_user` over raw `command` tasks.
