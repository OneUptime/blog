# Validation Summary: How to Use the failed_when Directive in Ansible

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible playbooks
- Ansible `failed_when`, `changed_when`, `when`, and `ignore_errors`
- Ansible `command`, `shell`, `copy`, `debug`, and `uri` modules
- GNU `grep` and `diff`
- Terraform CLI `plan -detailed-exitcode`
- PostgreSQL `psql` and `pg_dump`
- MySQL `mysqlcheck`
- Linux service and package-management commands

## Sources Consulted
- Ansible error handling in playbooks: https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_error_handling.html
- Ansible `ansible.builtin.shell` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/shell_module.html
- Ansible `ansible.builtin.uri` module: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/uri_module.html
- Ansible `ansible.builtin.copy` module: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/copy_module.html
- GNU Grep manual, exit status: https://www.gnu.org/s/grep/manual/html_node/Exit-Status.html
- GNU Diffutils manual: https://www.gnu.org/software/diffutils/manual/diffutils.html
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- PostgreSQL `psql` documentation: https://www.postgresql.org/docs/current/app-psql.html
- MySQL `mysqlcheck` documentation: https://dev.mysql.com/doc/mysql/8.0/en/mysqlcheck.html

## Issues Found
- The `apt-get update` example used a list under `failed_when`, which Ansible combines with implicit AND logic. That could let a non-zero `apt-get update` result pass if stderr contained a warning. Changed it to fail on `apt_update.rc != 0`.
- The database connectivity example used a `failed_when` list that only failed on non-zero return codes when stderr also contained "connection refused". That would miss other `psql` failures. Changed it to fail on any non-zero `db_check.rc`.
- The backup pipeline used `pg_dump ... | gzip` without `pipefail`, so the shell could return success if `pg_dump` failed but `gzip` succeeded. Added `set -o pipefail` and Bash execution for that shell task.
- The partial migration handler referenced `migration.rc` in a multi-condition `when` list. Changed it to one short-circuiting expression so skipped migration tasks do not risk an undefined attribute lookup.
- The `failed_when: false` explanation said the task would never fail "regardless of what happens". Ansible can still fail before a task result exists, such as syntax, connection, or execution issues. Narrowed the wording to task result failure.

## Review Notes
The main explanation of `failed_when` and list-based implicit AND behavior matches the current Ansible documentation. The examples intentionally use short module names, which remain valid, though Ansible documentation recommends fully qualified collection names for clearer linking and avoiding name conflicts.
