# Validation Summary: How to Create MySQL InnoDB Cluster Management

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- MySQL InnoDB Cluster
- MySQL Shell AdminAPI
- MySQL Group Replication
- MySQL Router
- MySQL Performance Schema
- Prometheus alerting rules
- Python MySQL Connector
- Node.js mysql2 client
- MySQL Enterprise Backup
- mysqldump

## Sources Consulted
- MySQL Shell 8.4 InnoDB Cluster overview: https://dev.mysql.com/doc/mysql-shell/8.4/en/mysql-innodb-cluster.html
- MySQL Shell 8.4 configuring production instances: https://dev.mysql.com/doc/mysql-shell/8.4/en/configuring-production-instances.html
- MySQL Shell AdminAPI Dba class reference: https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/classmysqlsh_1_1dba_1_1_dba.html
- MySQL Shell AdminAPI Cluster class reference: https://dev.mysql.com/doc/dev/mysqlsh-api-javascript/8.0/classmysqlsh_1_1dba_1_1_cluster.html
- MySQL Shell setting up InnoDB Cluster and MySQL Router: https://dev.mysql.com/doc/mysql-shell/8.0/en/setting-up-innodb-cluster-and-mysql-router.html
- MySQL Shell setting InnoDB Cluster options: https://dev.mysql.com/doc/mysql-shell/8.0/en/mysql-innodb-cluster-setting-options.html
- MySQL Shell rebooting a cluster from complete outage: https://dev.mysql.com/doc/mysql-shell/8.0/en/reboot-outage.html
- MySQL Shell 8.0.31 release notes for rebootClusterFromCompleteOutage option changes: https://dev.mysql.com/doc/relnotes/mysql-shell/8.0/en/news-8-0-31.html
- MySQL Shell monitoring InnoDB Cluster: https://dev.mysql.com/doc/mysql-shell/8.4/en/monitoring-innodb-cluster.html
- MySQL Router command-line options: https://dev.mysql.com/doc/mysql-router/8.0/en/mysqlrouter.html
- MySQL Router configuration file example and default ports: https://dev.mysql.com/doc/mysql-router/9.7/en/mysql-router-configuration-file-example.html
- MySQL Router configuration file syntax: https://dev.mysql.com/doc/mysql-router/8.0/en/mysql-router-configuration-file-syntax.html
- MySQL Group Replication and binary log checksum release note: https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-21.html
- MySQL replication option deprecation notes for metadata repositories: https://dev.mysql.com/doc/mysql-replication-excerpt/8.0/en/replication-options-replica.html
- MySQL transaction_write_set_extraction deprecation note: https://dev.mysql.com/doc/refman/8.0/en/replication-options-binary-log.html
- MySQL Performance Schema replication_group_member_stats table: https://dev.mysql.com/doc/en/performance-schema-replication-group-member-stats-table.html
- MySQL Performance Schema replication_applier_status_by_worker table: https://dev.mysql.com/doc/refman/8.0/en/performance-schema-replication-applier-status-by-worker-table.html
- MySQL Connector/Python connection examples: https://dev.mysql.com/doc/connector-python/en/connector-python-example-connecting.html
- MySQL Enterprise Backup restore documentation: https://dev.mysql.com/doc/mysql-enterprise-backup/8.0/en/restore.html

## Issues Found
- The server configuration snippet used deprecated `master_info_repository`, `relay_log_info_repository`, and `transaction_write_set_extraction` settings. I removed them because MySQL 8.0 defaults already use table-based replication metadata and `transaction_write_set_extraction` is deprecated as of MySQL 8.0.26.
- The `binlog_checksum=NONE` setting was presented as a universal requirement. I kept the setting for compatibility with MySQL 8.0.17 through 8.0.20, but added a note that it is optional on MySQL 8.0.21 and newer.
- The option-file snippet used trailing comments after option values. MySQL-style configuration files do not support trailing comments, so I moved those comments to separate lines.
- The cluster examples used `ipAllowlist`, which is valid only with the XCOM communication stack. I added `communicationStack: 'XCOM'` to the cluster creation examples to match the explicit Group Replication port and allowlist configuration.
- The full-outage recovery example used the removed `rejoinInstances` option for `dba.rebootClusterFromCompleteOutage()`. I updated the example to use the current `primary` option and rejoin recovered members with `cluster.rejoinInstance()` after reboot.
- The split-brain comment claimed `forceQuorumUsingPartitionOf()` makes the selected instance primary and removes unreachable members. I changed it to state the precise behavior: restoring quorum using the partition that contains the specified instance.
- The SQL monitoring query selected `LAST_APPLIED_TRANSACTION_END_APPLY_TIMESTAMP` from `performance_schema.replication_connection_status`, where that column does not exist. I changed the recovery-channel query to use columns from `replication_connection_status` and added worker apply timestamp checks against `replication_applier_status_by_worker`.
- The Prometheus lag script used the same incorrect Performance Schema table for apply timestamps. I updated it to query `replication_applier_status_by_worker` and return `0` when no apply timestamp is available.
- The `mysqlsh` command was inside a JavaScript code block. I split it into a Bash block followed by the MySQL Shell JavaScript examples.
- Two Mermaid diagrams used labels and references that would not render reliably. I updated the subgraph identifiers while keeping the diagrams' meaning unchanged.

## Review Notes
The guide is technically relevant and broadly aligned with MySQL Shell AdminAPI and MySQL Router workflows after the fixes. Future revisions could mention that MySQL 8.4 is the current LTS series and that the MySQL communication stack is the default and recommended communication stack in newer InnoDB Cluster deployments, while this post intentionally uses XCOM to match its `33061` Group Replication examples.
