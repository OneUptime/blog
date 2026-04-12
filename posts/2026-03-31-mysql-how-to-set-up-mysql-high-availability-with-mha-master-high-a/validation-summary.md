# Validation Summary: How to Set Up MySQL High Availability with MHA

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (replication, binlog-based)
- MHA (Master High Availability) - mha4mysql-manager and mha4mysql-node v0.58
- SSH key-based authentication
- CentOS/RHEL (yum/rpm package management)

## Sources Consulted
- MHA official documentation and wiki (https://github.com/yoshinorim/mha4mysql-manager/wiki)
- MySQL documentation on CHANGE MASTER TO and MASTER_AUTO_POSITION (https://dev.mysql.com/doc/refman/8.0/en/change-master-to.html)
- MySQL documentation on GTID replication requirements (https://dev.mysql.com/doc/refman/8.0/en/replication-gtids-howto.html)
- MHA configuration reference (https://github.com/yoshinorim/mha4mysql-manager/wiki/Parameters)

## Issues Found

1. **Manager host missing mha4mysql-node installation**: The original post only showed installing the `mha4mysql-manager` RPM on the management server. MHA manager requires `mha4mysql-node` to also be installed on the manager host, because the manager invokes node-level scripts (e.g., `save_binary_logs`, `apply_diff_relay_logs`) locally during failover. Fixed by adding the node package installation to the manager section.

2. **MASTER_AUTO_POSITION=1 requires GTID**: The replication setup used `MASTER_AUTO_POSITION=1`, which requires `gtid_mode=ON` and `enforce_gtid_consistency=ON` on all servers. The post did not cover GTID configuration, so this command would fail as written. Fixed by replacing with traditional binlog file/position-based replication (`MASTER_LOG_FILE` and `MASTER_LOG_POS`), which is the standard approach for MHA and does not require additional server configuration.

3. **Perl dependencies misattributed to node package**: The original post listed `perl-Config-Tiny`, `perl-Log-Dispatch`, and `perl-Parallel-ForkManager` as node dependencies, but these are actually manager dependencies. The node package only requires `perl` and `perl-DBD-MySQL`. Fixed by moving the additional Perl modules to the manager installation section.

## Review Notes
- The `CHANGE MASTER TO` and `START SLAVE` syntax is deprecated in MySQL 8.0.23+ in favor of `CHANGE REPLICATION SOURCE TO` and `START REPLICA`. Since MHA 0.58 is commonly used with MySQL 5.6/5.7, the older syntax is acceptable but may need updating for MySQL 8.0+ deployments.
- The `mha_user` is granted `ALL PRIVILEGES WITH GRANT OPTION`, which is overly permissive. In production, MHA needs `SUPER`, `REPLICATION CLIENT`, `REPLICATION SLAVE`, and `SELECT` privileges. The broad grant is a common tutorial simplification.
- MHA is no longer actively maintained (last release was 0.58 in 2018). For new deployments, alternatives like MySQL Group Replication, InnoDB Cluster, or Orchestrator may be worth considering.
