# Validation Summary: How to Set Up Cross-Region Database Read Replicas

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Amazon RDS
- Amazon Aurora Global Database
- AWS CLI
- Amazon CloudWatch
- Amazon Route 53 latency-based routing
- Python psycopg2

## Sources Consulted
- AWS CLI Command Reference: create-db-instance-read-replica - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance-read-replica.html
- Amazon RDS User Guide: Monitoring read replication - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.Monitoring.html
- Amazon RDS User Guide: Amazon CloudWatch metrics for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- Amazon Aurora User Guide: Using Amazon Aurora Global Database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- Amazon Aurora User Guide: Using switchover or failover in Amazon Aurora Global Database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- Amazon Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- AWS CLI Command Reference: failover-global-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/failover-global-cluster.html
- AWS CLI Command Reference: switchover-global-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/switchover-global-cluster.html
- AWS CLI Command Reference: Route 53 change-resource-record-sets - https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html

## Issues Found
- The RDS read replica command specified `--storage-type gp3` without `--iops`. The AWS CLI documentation says `gp3` must include an IOPS value when explicitly specified, so I added `--iops 3000`.
- The cross-Region RDS read replica example omitted `--source-region`. The AWS CLI can use this to generate the required presigned source-region request, so I added `--source-region us-east-1`.
- The replica lag check used `describe-db-instances` and queried `StatusInfos`, which reports read replica status/error information rather than lag values. I replaced it with a CloudWatch `ReplicaLag` metric query.
- Aurora Global Database was described as supporting up to 5 secondary regions. AWS documentation now states up to 10 read-only secondary Regions, so I updated the number.
- The Aurora Global Database failover section used `failover-global-cluster` for a planned operation and said unplanned failover should use `switchover-global-cluster`. AWS documentation defines switchover as the planned no-data-loss operation and failover as the unplanned disaster recovery operation, so I corrected the command and explanation.
- The unplanned Aurora failover description claimed an RPO of typically under 1 second. AWS documentation states failover RPO is typically a non-zero value measured in seconds and depends on replication lag, so I updated the wording.
- The Aurora CloudWatch metric command used BSD/macOS `date -v-1H`, which would fail in common Linux AWS CLI environments. I changed it to GNU-style `date -d '1 hour ago'`.

## Review Notes
The examples remain illustrative and still require real identifiers, subnet groups, credentials, security groups, and engine-version compatibility checks before use in production. The pricing note is directionally correct, but AWS transfer pricing varies by Region pair and should be rechecked against the current RDS pricing page when estimating costs.
