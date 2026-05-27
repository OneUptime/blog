# Validation Summary: How to Use Ansible to Configure MySQL Replication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.mysql collection
- MySQL 8.0
- MySQL GTID replication
- MySQL binary logs
- mysqldump

## Sources Consulted
- Ansible documentation: ansible.mysql.mysql_replication module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_replication_module.html
- Ansible documentation: ansible.mysql.mysql_user module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_user_module.html
- Ansible documentation: ansible.mysql.mysql_db module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_db_module.html
- Ansible documentation: ansible.mysql.mysql_query module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/mysql/mysql_query_module.html
- Ansible documentation: ansible.posix.synchronize module, https://docs.ansible.com/ansible/latest/collections/ansible/posix/synchronize_module.html
- MySQL 8.0 Reference Manual: Replication with Global Transaction Identifiers, https://dev.mysql.com/doc/refman/8.0/en/replication-gtids.html
- MySQL 8.0 Reference Manual: Setting Up Replication Using GTIDs, https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-howto.html
- MySQL 8.0 Reference Manual: Binary Logging Options and Variables, https://dev.mysql.com/doc/mysql/8.0/en/replication-options-binary-log.html
- MySQL 8.0 Reference Manual: mysqldump, https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: RESET REPLICA Statement, https://dev.mysql.com/doc/mysql/8.0/en/reset-replica.html
- MySQL 8.0 Reference Manual: Server System Variables, https://dev.mysql.com/doc/refman/8.0/en/server-system-variables.html

## Issues Found
- The examples used `community.mysql` modules. The official Ansible documentation now says this collection has been renamed to `ansible.mysql` and new playbooks should use `ansible.mysql`, so all MySQL module FQCNs were updated.
- The source configuration used `expire_logs_days`, which is deprecated in MySQL 8.0. Replaced it with `binlog_expire_logs_seconds = 604800` for seven-day binary log retention.
- The source server role hardcoded `server-id = 1` even though the post defines `mysql_server_id` host variables. Updated the source snippet to use `{{ mysql_server_id }}`.
- The replica setup used raw `STOP REPLICA` and `RESET REPLICA ALL` SQL through `mysql_query`. Replaced these with `ansible.mysql.mysql_replication` modes `stopreplica` and `resetreplicaall`, matching the current module API.
- The replication channel used `mode: changeprimary`. For MySQL 8.0.23 and later, the current statement is `CHANGE REPLICATION SOURCE TO`; updated the task to use `mode: changereplication`.
- Replica status assertions and debug output mixed legacy and current field names in a way that could evaluate missing fields. Updated them to use `get()` fallbacks for current `Replica_*` and legacy `Slave_*` fields.
- The dump initialization snippet used `creates` guards that could leave a stale compressed dump in place. Added cleanup of old dump files before creating a fresh dump and removed the unsafe guards.
- The import snippet loaded data while the replica configuration set `read_only` and `super_read_only` to `ON`. Added tasks to temporarily disable both settings before import and restore them afterward.

## Review Notes
- The post is technically relevant and the GTID auto-positioning approach is accurate for MySQL 8.0. MySQL still uses the `REPLICATION SLAVE` privilege name even though user-facing terminology has moved to source/replica.
- The examples assume the `ansible.mysql`, `ansible.posix`, and PyMySQL dependencies are installed on the appropriate systems.
