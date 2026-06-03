# Validation Summary: How to Create an RDS MariaDB Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- RDS for MariaDB
- AWS CLI
- MariaDB SQL
- RDS parameter groups and option groups
- Amazon CloudWatch Logs
- RDS gp3 storage

## Sources Consulted
- Amazon RDS User Guide: MariaDB on Amazon RDS versions - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MariaDB.Concepts.VersionMgmt.html
- Amazon RDS User Guide: Amazon RDS DB instance storage / gp3 storage - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- AWS CLI Command Reference: create-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- Amazon RDS User Guide: Publishing MariaDB logs to Amazon CloudWatch Logs - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MariaDB.PublishtoCloudWatchLogs.html
- Amazon RDS User Guide: Options for MariaDB database engine - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Appendix.MariaDB.Options.html
- AWS CLI Command Reference: create-option-group - https://docs.aws.amazon.com/cli/latest/reference/rds/create-option-group.html
- AWS CLI Command Reference: add-option-to-option-group - https://docs.aws.amazon.com/cli/latest/reference/rds/add-option-to-option-group.html
- MariaDB Documentation: Thread Pool in MariaDB - https://mariadb.com/docs/server/ha-and-performance/optimization-and-tuning/buffers-caches-and-threads/thread-pool/thread-pool-in-mariadb
- MariaDB Documentation: System-Versioned Tables - https://mariadb.com/docs/server/reference/sql-structure/temporal-tables/system-versioned-tables
- MariaDB Documentation: Server Status Variables - https://mariadb.com/kb/en/server-status-variables/
- MariaDB Documentation: InnoDB Server Status Variables - https://mariadb.com/kb/en/innodb-status-variables/
- MariaDB Documentation: Thread Pool System and Status Variables - https://mariadb.com/kb/en/thread-pool-system-status-variables/
- AWS RDS Free Tier page - https://aws.amazon.com/rds/free/

## Issues Found
- The post recommended "latest 10.11.x or 11.x" and used MariaDB `10.11.6` in the CLI example. Amazon RDS currently lists newer supported 10.11, 11.4, and 11.8 releases, and `10.11.6` is no longer in the current supported version table. Updated the guidance to current supported version families and changed the CLI example to `10.11.16`.
- The CLI example configured gp3 storage with 100 GiB, `--iops 6000`, and `--storage-throughput 250`. For RDS for MariaDB, provisioned gp3 IOPS and throughput are available only at 400 GiB and above, with the documented baseline at that threshold being 12,000 IOPS and 500 MiB/s. Updated the example to 400 GiB, 12,000 IOPS, and 500 MiB/s, and added a short storage caveat.
- The audit plugin section used a DB parameter group and `server_audit_logging` / `server_audit_events` parameters. RDS for MariaDB enables the MariaDB Audit Plugin through an option group using the `MARIADB_AUDIT_PLUGIN` option and option settings such as `SERVER_AUDIT_EVENTS`. Replaced the parameter group commands with `create-option-group`, `add-option-to-option-group`, and `modify-db-instance`.
- The thread pool section said the thread pool is enabled by default on RDS. The verified documentation supports that MariaDB thread pool can be enabled and tuned through `thread_handling=pool-of-threads`; the RDS default was not confirmed in official documentation during review. Changed the wording to say it is available on RDS and can be enabled/tuned through parameter groups.
- The monitoring section listed `Innodb_buffer_pool_hit_rate` as a metric. MariaDB documents `Innodb_buffer_pool_read_requests` and `Innodb_buffer_pool_reads`, which can be used to calculate the hit rate. Updated the metric guidance accordingly.

## Review Notes
The AWS CLI was not installed in the local environment, so command flags were verified against the official AWS CLI command reference rather than local `--help` output. The remaining SQL examples and CloudWatch log export syntax match the referenced MariaDB and AWS documentation.
