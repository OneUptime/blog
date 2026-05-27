# Validation Summary: How to Use Ansible to Create MySQL Databases

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.mysql collection
- MySQL
- PyMySQL
- YAML
- SQL

## Sources Consulted
- Ansible `ansible.mysql` collection documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/index.html
- Ansible `ansible.mysql.mysql_db` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_db_module.html
- Ansible `ansible.mysql.mysql_query` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_query_module.html
- Ansible `ansible.builtin.assert` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/assert_module.html
- Ansible collection installation documentation: https://docs.ansible.com/projects/ansible/latest/collections_guide/collections_installing.html
- MySQL 8.4 Reference Manual, Unicode character sets: https://dev.mysql.com/doc/refman/8.4/en/charset-unicode-sets.html

## Issues Found
- The post used the `community.mysql` collection and module FQCNs. Current Ansible documentation says `community.mysql` has been renamed to `ansible.mysql` and new playbooks should use `ansible.mysql`, so the install command and module names were updated.
- The prerequisite snippet implied that `pip install PyMySQL` was only a local setup step. The Ansible module documentation requires PyMySQL on the host that executes the module, normally the managed database host, so the text and command comments were clarified.
- SQL queries interpolated database names directly into query strings. The `mysql_query` module supports `positional_args`, so the role and verification queries were changed to parameterized queries.
- The `assert` example used Jinja delimiters inside an assertion expression. The `assert` module uses expressions in the same form as `when`, so this was changed to a direct expression.
- The conclusion overstated idempotency for all `mysql_db` usage, but the module documentation says `state: import` and `state: dump` are not idempotent. The conclusion now limits the idempotency claim to `state: present` database creation and the guarded schema import pattern.

## Review Notes
The examples assume the Unix socket path matches the target MySQL or MariaDB installation. The documented `/var/run/mysqld/mysqld.sock` path is common, but some distributions use a different socket path.
