# Validation Summary: How to Troubleshoot Aurora Reader Instance Lag

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon Aurora
- Aurora MySQL
- Aurora PostgreSQL
- Amazon RDS
- Amazon CloudWatch metrics and alarms
- AWS CLI
- boto3
- MySQL SQL diagnostics

## Sources Consulted
- AWS Aurora documentation: Replication with Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html
- AWS Aurora documentation: Replication with Amazon Aurora MySQL - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Replication.html
- AWS Aurora documentation: Amazon CloudWatch metrics for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- AWS Aurora documentation: Amazon CloudWatch dimensions for Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/dimensions.html
- AWS Aurora documentation: Aurora MySQL-specific information_schema tables - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Reference.ISTables.html
- AWS Aurora documentation: aurora_replica_status - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora_replica_status.html
- AWS CLI command reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI command reference: rds describe-db-instances - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- AWS CLI command reference: rds describe-db-clusters - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-clusters.html
- boto3 RDS client documentation: describe_db_instances - https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/describe_db_instances.html
- MySQL 8.0 Reference Manual: KILL statement - https://dev.mysql.com/doc/refman/8.0/en/kill.html
- MySQL 8.0 Reference Manual: SHOW PROCESSLIST and process list sources - https://dev.mysql.com/doc/refman/8.0/en/show-processlist.html

## Issues Found
- The opening described Aurora replication lag as "sub-millisecond." AWS documentation states Aurora Replica lag is usually much less than 100 milliseconds, so the wording was corrected to avoid overstating the guarantee.
- The CloudWatch examples queried `AuroraReplicaLag` with only `DBClusterIdentifier`. AWS documents `AuroraReplicaLag` as a replica metric and supports `DBClusterIdentifier, Role` for role aggregation, so the examples now include `Name=Role,Value=READER`.
- The Aurora MySQL SQL example used `mysql.ro_replica_status`, which AWS says has similar information but is not recommended. It now queries `information_schema.replica_host_status` and uses the documented `REPLICA_LAG_IN_MILLISECONDS` column.
- The diagnostic script tried to infer writer status from `DBInstanceRole`, which is not returned by RDS `DescribeDBInstances`. It now calls `describe_db_clusters()` and uses `DBClusterMembers[].IsClusterWriter`.
- The diagnostic script requested `AuroraReplicaLag` for every instance, including the writer. It now checks `AuroraReplicaLag` on readers and `AuroraReplicaLagMaximum` on the writer.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was validated against official AWS CLI command reference documentation rather than local `--help` output.
