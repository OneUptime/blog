# Validation Summary: How to Store Database Passwords in Ansible Vault

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible Vault
- Ansible playbooks, variables, lookups, filters, and `no_log`
- `community.postgresql` modules for PostgreSQL users, databases, and privileges
- PostgreSQL `pg_hba.conf` authentication
- `community.mysql` modules for MySQL users and databases
- `community.mongodb.mongodb_user`
- Jinja2 templates for YAML and environment files

## Sources Consulted
- Ansible Vault encryption guide: https://docs.ansible.com/ansible/latest/vault_guide/vault_encrypting_content.html
- Ansible logging and `no_log` documentation: https://docs.ansible.com/ansible/8/reference_appendices/logging.html
- `community.postgresql.postgresql_user` documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- `community.postgresql.postgresql_privs` documentation: https://docs.ansible.com/ansible/latest/collections/community/postgresql/postgresql_privs_module.html
- PostgreSQL `pg_hba.conf` documentation: https://www.postgresql.org/docs/current/auth-pg-hba-conf.html
- `community.mysql.mysql_user` documentation: https://docs.ansible.com/ansible/latest/collections/community/mysql/mysql_user_module.html
- `community.mysql.mysql_db` documentation: https://docs.ansible.com/ansible/latest/collections/community/mysql/mysql_db_module.html
- `community.mongodb.mongodb_user` documentation: https://docs.ansible.com/ansible/latest/collections/community/mongodb/mongodb_user_module.html
- `ansible.builtin.password` lookup documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/password_lookup.html
- `ansible.builtin.to_json` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/to_json_filter.html
- `ansible.builtin.urlencode` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/urlencode_filter.html
- PostgreSQL connection URI documentation: https://www.postgresql.org/docs/current/libpq-connect.html

## Issues Found
- The PostgreSQL example used `scram-sha-256` in `pg_hba.conf` but did not force SCRAM password hashing when setting passwords. Added `PGOPTIONS: "-c password_encryption=scram-sha-256"` to the PostgreSQL password tasks, matching the `community.postgresql.postgresql_user` documentation.
- The PostgreSQL user task used `db` and `priv` on `community.postgresql.postgresql_user`. Current documentation marks `db` as a deprecated alias for `login_db`, and privilege management belongs in `community.postgresql.postgresql_privs`. Removed those parameters from the user task and added a separate privileges task.
- The MySQL follow-up tasks relied on implicit connection settings after setting the root password. Added `login_unix_socket` to the database and application-user tasks to keep the example consistent with the documented socket-authentication pattern.
- The `database.yml` template inserted the password unquoted, which can break YAML when generated passwords contain special characters. Changed the password value to use `to_json` so it renders as a valid quoted scalar.
- The `.env` connection-string template inserted raw credentials into URI user-info fields. Added URL encoding, with `/` replacement, so generated passwords containing URI-reserved characters do not corrupt the URL.
- The password lookup examples used the older compact lookup-string form. Changed them to the documented FQCN and keyword/list form for clarity and current documentation alignment.
- The password generation play wrote a plaintext file with mode `0644` before encrypting it and then encrypted a relative path without setting the working directory. Changed the temporary file mode to `0600`, renamed the task to reflect that it is pre-encryption, and added `chdir: "{{ playbook_dir }}"`.

## Review Notes
Ansible was not installed in the local workspace, so CLI verification was performed against the current official Ansible documentation rather than local `--help` output. The examples assume the required community collections and Python database drivers are installed on the managed hosts, as documented by the respective collection modules.
