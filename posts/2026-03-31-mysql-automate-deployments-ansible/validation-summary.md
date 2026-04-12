# Validation Summary: How to Automate MySQL Deployments with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- Ansible (core automation engine)
- community.mysql Ansible collection (mysql_user, mysql_db, mysql_query modules)
- Ansible Vault (secrets management)
- Jinja2 templating
- Ubuntu/Debian package management (apt)

## Sources Consulted
- [community.mysql.mysql_user module — Ansible Community Documentation](https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_user_module.html) — verified `host_all`, `login_unix_socket`, `priv` parameters
- [community.mysql.mysql_query module — Ansible Community Documentation](https://docs.ansible.com/projects/ansible/latest/collections/community/mysql/mysql_query_module.html) — verified `query`, `login_db` parameters
- [community.mysql.mysql_db module — Ansible Community Documentation](https://docs.ansible.com/ansible/latest/collections/community/mysql/mysql_db_module.html) — verified `name`, `state`, `login_user`, `login_password` parameters
- [Ansible Vault documentation](https://docs.ansible.com/ansible/latest/vault_guide/index.html) — verified `encrypt_string` syntax and `--vault-password-file` flag
- MySQL Server documentation — verified configuration directives (`bind-address`, `max_connections`, `innodb_buffer_pool_size`, `slow_query_log`, `long_query_time`, `log_error`)

## Issues Found
1. **Missing Ansible handler for "Restart MySQL"**: The playbook's template task used `notify: Restart MySQL` but no `handlers:` section was defined. Ansible would fail at runtime with: `ERROR! The requested handler 'Restart MySQL' was not found`. Added the missing handler block with a `service` task to restart MySQL.

## Review Notes
- The `fileglob` lookup in the migrations task resolves files on the Ansible **controller**, not the remote host. This is correct for the use case (SQL migration files stored alongside playbooks) but could confuse readers who expect remote file resolution.
- The playbook binds MySQL to `0.0.0.0` by default, which exposes it on all network interfaces. This is intentional for the tutorial's primary/replica topology but should be used with appropriate firewall rules in production.
- The `community.mysql` collection requires `PyMySQL` on the remote hosts, which the playbook correctly installs via the `python3-pymysql` package.
