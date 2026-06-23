# Validation Summary: How to Set Up MySQL with Replication for High Availability on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 22.04/24.04
- MySQL Server 8.0
- MySQL binary log replication
- MySQL GTID replication
- MySQL semi-synchronous replication
- MySQL TLS/SSL configuration
- Bash, systemd, cron, OpenSSL, scp, ssh

## Sources Consulted
- MySQL 8.0 Reference Manual: Replication - https://dev.mysql.com/doc/refman/8.0/en/replication.html
- MySQL 8.0 Reference Manual: CHANGE REPLICATION SOURCE TO Statement - https://dev.mysql.com/doc/refman/8.0/en/change-replication-source-to.html
- MySQL 8.0 Reference Manual: mysqldump - https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual: GTID Options and Variables - https://dev.mysql.com/doc/refman/8.0/en/replication-options-gtids.html
- MySQL 8.0 Reference Manual: Semisynchronous Replication Installation - https://dev.mysql.com/doc/refman/8.0/en/replication-semisync-installation.html
- MySQL 8.0 Reference Manual: Replication and Transaction Inconsistencies - https://dev.mysql.com/doc/refman/8.0/en/replication-features-transaction-inconsistencies.html
- MySQL 8.0 Reference Manual: Pluggable Authentication - https://dev.mysql.com/doc/refman/8.0/en/pluggable-authentication.html
- MySQL 8.0 Reference Manual: Password Validation Options and Variables - https://dev.mysql.com/doc/refman/8.0/en/validate-password-options-variables.html
- MySQL 8.0 Reference Manual: RESET MASTER Statement - https://dev.mysql.com/doc/refman/8.0/en/reset-master.html
- Ubuntu Server documentation: Install and configure a MySQL server - https://ubuntu.com/server/docs/how-to/databases/install-mysql/

## Issues Found
- Replaced `IDENTIFIED WITH mysql_native_password` with `IDENTIFIED BY` for replication users because `mysql_native_password` is deprecated in MySQL 8.0.34+ and `caching_sha2_password` is the default MySQL 8.0 authentication plugin.
- Replaced `mysqldump --master-data=2` with `mysqldump --source-data=2` because `--master-data` is deprecated in current MySQL 8.0 releases.
- Corrected the GTID configuration comment that said `ROW` binary logging is required. `ROW` is recommended, but GTID mode does not require row-based binary logging.
- Added `replica_parallel_type = LOGICAL_CLOCK` next to `replica_preserve_commit_order = ON` because preserving commit order requires logical-clock parallel replication; this is default only in MySQL 8.0.27 and later.
- Corrected failover guidance that described promoting the replica with the "highest GTID." GTID sets are not scalar values; the safer guidance is to prefer a replica whose executed GTID set is a superset of the others.
- Removed `RESET MASTER` from old-master recovery and GTID troubleshooting paths because clearing binary logs and GTID history is unsafe as a routine recovery step and can cause duplicate transaction application unless the server is fully rebuilt.
- Fixed TLS certificate copy commands so files are copied to a writable directory first, then moved into `/etc/mysql/ssl` with MySQL-readable ownership and permissions.
- Added a check/install step for `component_validate_password` before setting `validate_password.*` variables, because those variables exist only when the validation component is installed.

## Review Notes
- The guide uses MySQL 8.0.22+ source/replica terminology (`CHANGE REPLICATION SOURCE TO`, `SHOW REPLICA STATUS`, `START REPLICA`, `STOP REPLICA`), which is appropriate for current Ubuntu 22.04/24.04 MySQL 8.0 packages.
- `REPLICATION SLAVE` remains the MySQL privilege name even though source/replica terminology is used for statements and status output.
- The guide is technically valid after the fixes, but production deployments should still test failover procedures in a staging environment because manual MySQL failover is operationally sensitive.
