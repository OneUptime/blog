# Validation Summary: How to Use Ansible Delegation for Database Operations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible task delegation
- Ansible `run_once`, `serial`, and block/rescue behavior
- `community.mysql` collection
- `community.postgresql` collection
- PostgreSQL `psql` and `pg_dump`
- MySQL / MariaDB database modules

## Sources Consulted
- Ansible delegation documentation: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_delegation.html
- Ansible playbook strategies and `run_once` behavior: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_strategies.html
- Ansible block/rescue documentation: https://docs.ansible.com/projects/ansible-core/devel/playbook_guide/playbooks_blocks.html
- Ansible `community.mysql.mysql_db` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_db_module.html
- Ansible `community.mysql.mysql_user` module documentation: https://docs.ansible.com/ansible/latest/collections/community/mysql/mysql_user_module.html
- Ansible `community.postgresql.postgresql_ping` module documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_ping_module.html
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/15/app-psql.html
- PostgreSQL `pg_dump` documentation: https://www.postgresql.org/docs/17/app-pgdump.html

## Issues Found
- `run_once: true` was used with `serial: 1` in the PostgreSQL deployment example. Ansible runs `run_once` tasks once per serial batch, not once for the entire play, so the database migration tasks could run once per application server. Added `when: inventory_hostname == ansible_play_hosts_all[0]` to the delegated database tasks and documented the serial caveat in the summary.
- The MySQL section described the MySQL modules as built-in Ansible modules. The examples use `community.mysql`, which is a collection and not part of `ansible-core`. Updated the wording to identify the `community.mysql` collection.
- The PostgreSQL deployment example used `db_password` without defining it. Added `db_password: "{{ vault_db_password }}"` to the example variables.
- The MySQL import example used `app_version` without defining it. Added `app_version: "3.2.0"` to the example variables.
- The rollback example used `target_version` without defining it. Added `target_version: "3.2.0"` to the example variables.
- The PostgreSQL ping example used the deprecated `db` alias. Replaced it with the current `login_db` parameter.

## Review Notes
The YAML snippets parse successfully with PyYAML. `ansible-playbook` is not installed in this workspace, so Ansible's own syntax checker could not be run. The examples remain deployment patterns and still assume the referenced inventory hosts, vault variables, migration scripts, database schemas, backup directories, and database authentication are configured in the user's environment.
