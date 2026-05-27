# Validation Summary: How to Use Ansible to Create MySQL Users

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.mysql collection
- MySQL user management
- MySQL authentication plugins
- Ansible Vault
- PyMySQL

## Sources Consulted
- Ansible `ansible.mysql.mysql_user` module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/mysql/mysql_user_module.html
- Ansible `community.mysql.mysql_user` module documentation and rename notice: https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html
- Ansible `ansible.mysql.mysql_query` module documentation: https://docs.ansible.com/projects/ansible/13/collections/ansible/mysql/mysql_query_module.html
- Ansible Vault CLI documentation: https://docs.ansible.com/projects/ansible/latest/cli/ansible-vault.html
- MySQL 8.0 Caching SHA-2 authentication documentation: https://dev.mysql.com/doc/mysql/8.0/en/caching-sha2-pluggable-authentication.html
- MySQL 8.0 pluggable authentication documentation: https://dev.mysql.com/doc/mysql/8.0/en/pluggable-authentication.html
- MySQL account name and host pattern documentation: https://dev.mysql.com/doc/refman/8.0/en/account-names.html
- MySQL resource limit documentation: https://dev.mysql.com/doc/refman/8.4/en/user-resources.html

## Issues Found
- Replaced `community.mysql` examples and installation command with `ansible.mysql`. The current Ansible documentation says the `community.mysql` collection has been renamed and new playbooks should use `ansible.mysql`.
- Corrected the explicit `caching_sha2_password` example to use `plugin_auth_string` and a 20-character `salt` instead of `password`. The module documentation shows this parameter combination for `caching_sha2_password`.
- Added `plugin_auth_string` and `salt` support to the reusable role, and changed the role's `password` field to `default(omit)` so users authenticated with non-default plugin options do not require a plain `password` item.
- Added a vault variable for the `caching_sha2_password` example password and salt so the updated example references defined variables.
- Updated the password rotation verification task to run from an allowed client host and connect to `mysql_server_host`. The original example tried to verify a user scoped to `10.0.1.%` by connecting to `127.0.0.1`, which would not match the MySQL account host restriction.
- Added a note that `mysql_native_password` is deprecated in MySQL 8.0.34 and later.
- Clarified that PyMySQL must be installed on hosts that run the Ansible MySQL modules, matching the module requirement.

## Review Notes
The remaining examples are syntactically valid YAML snippets and use supported module parameters. The post still uses wildcard host patterns such as `10.0.1.%`; these are valid MySQL host patterns, but they are not CIDR subnet syntax.
