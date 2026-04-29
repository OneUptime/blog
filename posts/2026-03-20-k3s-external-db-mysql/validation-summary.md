# Validation Summary: How to Configure K3s with an External Database (MySQL) - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- K3s
- Kubernetes
- MySQL
- MySQL replication
- Linux system administration on Ubuntu
- UFW firewall

## Sources Consulted
- K3s Cluster Datastore: https://docs.k3s.io/datastore
- K3s High Availability External DB: https://docs.k3s.io/datastore/ha
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- MySQL 8.0 Reference Manual, Setting the Replication Source Configuration: https://dev.mysql.com/doc/refman/8.0/en/replication-howto-masterbaseconfig.html
- MySQL 8.0 Reference Manual, Setting the Source Configuration on the Replica: https://dev.mysql.com/doc/refman/8.0/en/replication-howto-slaveinit.html
- MySQL 8.0 Reference Manual, CHANGE REPLICATION SOURCE TO Statement: https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual, START REPLICA Statement: https://dev.mysql.com/doc/refman/8.0/en/start-replica.html
- MySQL 8.0 Reference Manual, SHOW REPLICA STATUS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- MySQL 8.0 Reference Manual, What Is New in MySQL 8.0: https://dev.mysql.com/doc/refman/8.0/en/mysql-nutshell.html
- MySQL 8.4 Reference Manual, SHOW BINARY LOG STATUS Statement: https://dev.mysql.com/doc/refman/8.4/en/show-binary-log-status.html
- Kine MySQL driver source: https://github.com/k3s-io/kine/blob/master/pkg/drivers/mysql/mysql.go

## Issues Found
- The post granted `SELECT` on `performance_schema.*` to the K3s user, but that requirement is not documented by K3s and Kine's MySQL driver checks `information_schema`, not `performance_schema`. I removed the extra grant to avoid documenting an unnecessary privilege.
- The MySQL tuning example used `innodb_log_file_size`, which is deprecated in modern MySQL 8.0 and superseded by `innodb_redo_log_capacity`. I replaced it with `innodb_redo_log_capacity`.
- The text said K3s "requires specific MySQL configuration for reliability," but the settings shown were a mix of optional tuning, remote-access configuration, and replication-related settings. I corrected the wording so it no longer overstates what K3s itself requires.
- The second/third server and agent examples wrote `/etc/rancher/k3s/config.yaml` without first creating `/etc/rancher/k3s`. On a clean node, those commands would fail. I added `sudo mkdir -p /etc/rancher/k3s` to those sections.
- The agent install example used `INSTALL_K3S_EXEC="agent"` in front of `sudo sh -`, which is not reliable on a default `sudo` environment. I changed it to the documented `sudo sh -s - agent` form.
- The replication example used older MySQL terminology and commands: `CHANGE MASTER TO`, `START SLAVE`, and `SHOW SLAVE STATUS`. I updated them to `CHANGE REPLICATION SOURCE TO`, `START REPLICA`, and `SHOW REPLICA STATUS\G`.
- The replication example hard-coded `MASTER_LOG_POS=0`, which is incorrect. MySQL requires the actual file and position returned by the source status command. I replaced the values with explicit placeholders tied to the recorded source coordinates.
- The replication section described primary/replica replication as HA by itself. I corrected the wording to state that replication should be paired with a failover mechanism or managed HA database service.
- The monitoring section implied the slow query log file would exist as shown, but the post never enabled it. I qualified that command with "If enabled" to avoid a false assumption.
- The conclusion overstated the HA story by implying that MySQL replication alone completes the design. I adjusted it so the K3s control-plane HA and database-layer HA requirements are described separately and accurately.

## Review Notes
- K3s supports MySQL as an external datastore, and current K3s documentation lists MySQL 8.0 and 8.4 as certified versions.
- K3s supports datastore TLS using `datastore-cafile`, `datastore-certfile`, and `datastore-keyfile`. K3s documentation also notes a known issue with setting the MySQL DSN `tls` parameter directly.
- K3s documentation notes that multi-master databases that change `auto_increment_increment` or `auto_increment_offset` beyond `1` are not supported by Kine. The post's primary/replica framing is compatible with that limitation, but Galera-style multi-primary setups would need separate caveats if added later.
