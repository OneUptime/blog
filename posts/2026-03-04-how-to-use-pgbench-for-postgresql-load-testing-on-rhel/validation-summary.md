# Validation Summary: How to Use pgbench for PostgreSQL Load Testing on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- PostgreSQL
- pgbench
- systemd
- dnf
- SQL

## Sources Consulted
- PostgreSQL pgbench documentation: https://www.postgresql.org/docs/current/pgbench.html
- Red Hat Enterprise Linux 9 PostgreSQL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- Red Hat Virtualization PostgreSQL setup documentation: https://docs.redhat.com/pt-br/documentation/red_hat_virtualization/4.4/html/installing_red_hat_virtualization_as_a_standalone_manager_with_local_databases/Preparing_a_Local_Manually-Configured_PostgreSQL_Database_SM_localDB_deploy

## Issues Found
- The post described `--log` as outputting a latency histogram. PostgreSQL documentation states that `--log` writes per-transaction information to log files, so the comment was changed to "Output per-transaction logs for latency analysis."
- The final scale-factor guidance implied that higher scale factors inherently make the dataset too large for memory and recommended sizing only against `shared_buffers`. The wording was changed to clarify that higher scale factors help when they create a dataset larger than the memory target being tested.

## Review Notes
The pgbench initialization and benchmark flags (`-i`, `-s`, `-c`, `-j`, `-T`, `-S`, `-f`, `--progress`, `--report-per-command`, `--log`, and `--log-prefix`) match the current PostgreSQL documentation. The RHEL setup commands are consistent with Red Hat documentation for installing, initializing, enabling, and starting PostgreSQL.
