# Validation Summary: How to Run MySQL Replicas in Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 (GTID-based replication)
- Docker / Docker Compose

## Sources Consulted
- MySQL 8.0 Reference Manual — https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html (verified CHANGE REPLICATION SOURCE TO syntax: SOURCE_HOST, SOURCE_USER, SOURCE_PASSWORD, SOURCE_AUTO_POSITION; confirmed START REPLICA, STOP REPLICA, RESET REPLICA ALL, SHOW REPLICA STATUS are current 8.0.23+ statements that replaced the deprecated CHANGE MASTER TO / START SLAVE family)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- The post correctly uses the modern, non-deprecated replication vocabulary (REPLICA / SOURCE) throughout, including `CHANGE REPLICATION SOURCE TO ... SOURCE_AUTO_POSITION=1` for GTID auto-positioning. This matches the 8.0.23+ manual.
- `gtid_mode = ON`, `enforce_gtid_consistency = ON`, `binlog_format = ROW`, and unique `server-id` per node are all required/correct for GTID replication, as stated.
- `binlog_expire_logs_seconds = 86400` is a valid (non-default; server default is 2592000) tuning value, not an error.
- `IDENTIFIED WITH mysql_native_password` is deprecated in MySQL 8.0 (removed in 8.4) but is still valid and functional on the `mysql:8.0` image used in the guide, so it was left as-is; this is a reasonable choice for replication-user compatibility.
- The status-field names (`Replica_IO_Running`, `Replica_SQL_Running`, `Seconds_Behind_Source`) match the renamed `SHOW REPLICA STATUS` output columns in 8.0.
