# Validation Summary: How to Use Ansible for Multi-Tenant Infrastructure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ansible playbooks and roles
- Ansible built-in modules and lookup plugins
- community.postgresql collection
- amazon.aws Route 53 module
- community.general Slack, UFW, and timezone modules
- PostgreSQL role, database, script, query, and privilege automation
- HashiCorp Vault CLI
- Certbot DNS Route 53 plugin
- Nginx tenant configuration
- Cron-based automation

## Sources Consulted
- Ansible community.postgresql.postgresql_user module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_user_module.html
- Ansible community.postgresql.postgresql_privs module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_privs_module.html
- Ansible community.postgresql.postgresql_query module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_query_module.html
- Ansible community.postgresql.postgresql_script module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/postgresql/postgresql_script_module.html
- Ansible ansible.builtin.password lookup documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/password_lookup.html
- Ansible ansible.builtin.include_vars module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/include_vars_module.html
- Ansible ansible.builtin.find module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/find_module.html
- Ansible amazon.aws.route53 module documentation: https://docs.ansible.com/projects/ansible/latest/collections/amazon/aws/route53_module.html
- Ansible community.general.slack module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/slack_module.html
- Ansible community.general.timezone module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/general/timezone_module.html
- Ansible ansible.builtin.uri module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible ansible.builtin.cron module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/cron_module.html

## Issues Found
- The tenant database user task used `priv: "ALL"` on `community.postgresql.postgresql_user`, but current documentation no longer lists that parameter. I removed it and added a `community.postgresql.postgresql_privs` task to grant database privileges with the supported module.
- The generated database password was not stored for reuse; the Vault task attempted to store `tenant_db_user.queries`, which is a list of executed SQL statements, not the generated password. I added a `set_fact` task for `tenant_db_password`, reused it in the user creation task, and stored that value in Vault.
- The password lookup used the older short lookup form. I updated it to `ansible.builtin.password` with documented keyword arguments for length and character sets.
- The migration task used `community.postgresql.postgresql_query` with `path_to_script`, but current documentation uses `community.postgresql.postgresql_script` with `path` for SQL files. I updated the task accordingly.
- PostgreSQL tasks used the deprecated `db` alias where `login_db` is the current documented parameter. I changed those examples to `login_db`.
- The seed data query interpolated values directly into SQL. I changed it to use `named_args`, matching the documented parameterized-query pattern.
- The tenant resource role loaded all tenant files into one variable namespace, which would overwrite same-named variables rather than produce a per-tenant collection. I changed it to find tenant files, include each one under `tenant_config`, and loop over the registered include results.
- The resource limit task built a raw `ALTER ROLE` SQL statement using tenant IDs that can contain hyphens, which would be invalid unless quoted. I changed it to use `community.postgresql.postgresql_user` with `conn_limit`, allowing the module to handle role names correctly.
- The provisioning workflow used `ansible.builtin.timezone`, but the current documented module is `community.general.timezone`. I updated the FQCN.

## Review Notes
Ansible is not installed in this workspace, so I could not run `ansible-playbook --syntax-check`. The review was completed by static inspection against current official Ansible documentation. The Certbot and Vault examples are plausible command usages but still depend on the target environment having the relevant plugins, authentication, and policies configured.
