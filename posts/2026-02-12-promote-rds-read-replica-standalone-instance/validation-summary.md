# Validation Summary: How to Promote an RDS Read Replica to a Standalone Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- RDS read replicas
- AWS CLI
- boto3 for Python
- MySQL on Amazon RDS
- PostgreSQL on Amazon RDS
- CloudWatch monitoring

## Sources Consulted
- Amazon RDS User Guide: Promoting a read replica to be a standalone DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Promote.html
- AWS CLI Command Reference: `aws rds promote-read-replica`: https://docs.aws.amazon.com/cli/latest/reference/rds/promote-read-replica.html
- boto3 RDS client documentation: `promote_read_replica`: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/promote_read_replica.html
- Amazon RDS User Guide: Creating a read replica: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Create.html
- Amazon RDS User Guide: Differences between read replicas for DB engines: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Overview.Differences.html
- Amazon RDS User Guide: Working with read replicas for Amazon RDS for PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PostgreSQL.Replication.ReadReplicas.html
- Amazon RDS User Guide: Configuring RDS for MySQL binary logging for instance deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_LogAccess.MySQL.BinaryFormat.html
- Amazon RDS User Guide: Enabling automated backups: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_WorkingWithAutomatedBackups.Enabling.html

## Issues Found
- The promotion steps said RDS creates a new endpoint, then parenthetically contradicted that by saying the endpoint stays the same. Changed this to state that the replica endpoint is retained and now points to the standalone instance.
- The post said read replicas do not have independent automated backups. AWS documents backup support as engine- and version-specific: for example, MySQL, MariaDB, Oracle, and Db2 read replicas support automated backups, PostgreSQL read replicas support automated backups only on RDS for PostgreSQL 14.1 and higher, and SQL Server read replicas do not support automated backups. Updated the wording to avoid the blanket claim.
- The timeline claimed the reboot downtime is usually under a minute. AWS documents that promotion takes minutes or longer and that RDS reboots the read replica, but does not guarantee a sub-minute reboot. Updated the step to say existing connections are dropped during reboot.
- The MySQL section implied binary logging is enabled only by changing `binlog_format`. AWS documents that RDS for MySQL binary logging is controlled by automated backups, while `binlog_format` controls the logging format. Updated the explanation and changed the parameter update to `ApplyMethod=immediate`, matching AWS guidance that `binlog_format` is dynamic for RDS for MySQL.
- The PostgreSQL section included implementation-specific statements about crash recovery, `hot_standby`, and old-primary replication slots that were not supported by the cited RDS documentation. Replaced them with documented behavior: promotion stops WAL receipt from the source, makes the instance writable, and PostgreSQL 14.1+ cascading replicas continue receiving WAL from the promoted instance.

## Review Notes
- The AWS CLI `promote-read-replica`, `modify-db-instance`, `describe-db-instances`, and `describe-events` examples use valid option names and syntax.
- The boto3 example uses current RDS client method names and parameter casing. The local environment did not have the AWS CLI installed, so CLI verification was performed against official AWS CLI documentation rather than local `--help` output.
- The post is about non-Aurora RDS read replicas. AWS documents that `promote-read-replica` does not apply to Aurora MySQL, Aurora PostgreSQL, or RDS Custom.
