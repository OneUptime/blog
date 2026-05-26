# Validation Summary: How to Use the community.mysql Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.mysql collection
- community.mysql collection migration
- MySQL
- MariaDB
- PyMySQL
- MySQL replication

## Sources Consulted
- Ansible ansible.mysql collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/index.html
- Ansible ansible.mysql.mysql_db module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_db_module.html
- Ansible ansible.mysql.mysql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_user_module.html
- Ansible ansible.mysql.mysql_query module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_query_module.html
- Ansible ansible.mysql.mysql_variables module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_variables_module.html
- Ansible ansible.mysql.mysql_replication module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_replication_module.html
- Ansible community.mysql collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/index.html
- ansible.mysql mysql_replication module source: https://raw.githubusercontent.com/ansible-collections/ansible.mysql/main/plugins/modules/mysql_replication.py

## Issues Found
- The post used `community.mysql` throughout, but official Ansible documentation says `community.mysql` has been renamed to `ansible.mysql` and new playbooks should use `ansible.mysql`. I updated the collection installation command, requirements file, module FQCNs, description, overview, and conclusion to use `ansible.mysql`, while adding a note that `community.mysql` was the old name.
- The installation section only mentioned `PyMySQL`, but the `mysql_db` module's import and dump states also require the `mysql` and `mysqldump` command-line binaries on the module execution host. I added that requirement.
- The replication health assertion only checked legacy `Slave_*` and `Seconds_Behind_Master` fields. Current MySQL replica status can return `Replica_*` and `Seconds_Behind_Source` fields, while MariaDB may still return `Slave_*` fields. I updated the assertion to handle both forms.

## Review Notes
The examples are illustrative and still assume common local Unix socket paths and pre-existing credentials, inventory variables, Vault values, dump files, and replication users. Those operational prerequisites are reasonable for a tutorial but should be adjusted for a real environment.
