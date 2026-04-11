# Validation Summary: How to Manage MySQL Configuration with Ansible

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (8.0+)
- Ansible (core playbooks, templates, group_vars)
- community.mysql Ansible collection (mysql_variables module)
- Jinja2 templating

## Sources Consulted
- Ansible documentation on variable precedence: https://docs.ansible.com/ansible/latest/playbook_guide/playbooks_variables.html#variable-precedence-where-should-i-put-a-variable
- Ansible `combine` filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/combine_filter.html
- Ansible `hash_behaviour` deprecation (deprecated in 2.17): https://docs.ansible.com/ansible/latest/reference_appendices/config.html#default-hash-behaviour
- community.mysql.mysql_variables module source and docs: https://docs.ansible.com/ansible/latest/collections/community/mysql/mysql_variables_module.html
- MySQL Server System Variables reference: https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html
- MySQL `--validate-config` option (added in 8.0.16): https://dev.mysql.com/doc/refman/8.0/en/server-options.html#option_mysqld_validate-config

## Issues Found

### 1. Dictionary variable override bug (Critical)
**What was wrong:** The `group_vars/mysql_primary/main.yml` file defined `mysql_config` with only `read_only` and `log_replica_updates`. Because Ansible's default `hash_behaviour` is `replace` (not `merge`), a host in the `mysql_primary` child group would have its entire `mysql_config` dictionary replaced by the child group's version, losing all base settings (`max_connections`, `innodb_buffer_pool_size`, `slow_query_log`, etc.). The comment said "Override settings for primary servers only" but the actual behavior would discard all base configuration.

**What was changed:** Renamed the variable in `group_vars/mysql_primary/main.yml` from `mysql_config` to `mysql_config_overrides`, and added a `pre_tasks` step in the playbook to merge the two dictionaries using Ansible's `combine` filter with `recursive=True`. This ensures base settings are preserved and only the specified keys are overridden.

### 2. Redundant and fragile `vars_files` directive (Moderate)
**What was wrong:** The playbook used `vars_files: - "group_vars/{{ group_names[0] }}/main.yml"` to explicitly load group variables. This is problematic because: (a) Ansible automatically loads files from `group_vars/` directories based on host group membership, making this redundant; (b) `group_names[0]` selects the first group alphabetically, which may not be the intended group and leads to unpredictable behavior.

**What was changed:** Removed the `vars_files` directive entirely, relying on Ansible's automatic group_vars loading mechanism instead.

## Review Notes
- `expire_logs_days` (used in the base config) has been deprecated since MySQL 8.0.3 in favor of `binlog_expire_logs_seconds`. It still works but may be removed in a future MySQL release.
- The `--validate-config` flag in the template validation step requires MySQL 8.0.16 or later.
- The restart pattern (using `when: mysql_config_changed.changed`) works but could be replaced with Ansible handlers for a more idiomatic approach. This is a style preference, not an error.
- The `community.mysql.mysql_variables` module returns variable values in the `msg` field when getting (not setting) a variable. The usage in the post is correct.
- The Jinja2 template's `replace('_', '-')` filter converts underscores to hyphens in config keys. MySQL accepts both formats in configuration files, so this is correct.
