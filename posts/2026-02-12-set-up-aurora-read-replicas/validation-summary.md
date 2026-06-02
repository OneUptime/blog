# Validation Summary: How to Set Up Aurora Read Replicas

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Aurora
- Amazon RDS
- Aurora Replicas and reader endpoints
- Aurora custom endpoints
- Aurora Auto Scaling with Application Auto Scaling
- AWS CLI
- Amazon CloudWatch metrics and alarms
- SQLAlchemy
- psycopg2 connection pooling

## Sources Consulted
- Amazon Aurora User Guide: Replication with Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Replication.html
- Amazon Aurora User Guide: Reader endpoints for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Reader.html
- Amazon Aurora User Guide: High availability for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.AuroraHighAvailability.html
- Amazon Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- Amazon Aurora User Guide: Amazon CloudWatch dimensions for Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/dimensions.html
- Amazon RDS User Guide: Working with DB instance read replicas - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ReadRepl.html
- AWS CLI Command Reference: rds create-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI Command Reference: rds create-db-cluster-endpoint - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster-endpoint.html
- AWS CLI Command Reference: rds modify-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS CLI Command Reference: application-autoscaling register-scalable-target - https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/register-scalable-target.html
- AWS CLI Command Reference: application-autoscaling put-scaling-policy - https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scaling-policy.html
- AWS CLI Command Reference: cloudwatch get-metric-statistics - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- SQLAlchemy documentation: Engine Configuration - https://docs.sqlalchemy.org/en/20/core/engines.html
- Psycopg 2 documentation: Connections pooling - https://www.psycopg.org/docs/pool.html

## Issues Found
- The post described Aurora replica lag as "typically 10-20 milliseconds" and said a new replica is "immediately in sync." AWS documents Aurora replica lag as usually much less than 100 milliseconds and variable with write volume. Updated the wording to "minimal lag" and "usually much less than 100 milliseconds."
- The post compared Aurora's 15 replicas per cluster with "5 for standard RDS." Current RDS documentation has engine-specific limits, including up to 15 read replicas for several RDS engines. Removed the outdated comparison while preserving the Aurora limit.
- The CloudWatch examples used `AuroraReplicaLag` with only `DBClusterIdentifier` while describing cluster-wide reader lag. AWS documents `AuroraReplicaLag` as a replica instance metric and `AuroraReplicaLagMaximum` as the cluster maximum. Updated the metric name in both the statistics command and alarm.
- The `get-metric-statistics` command used `date -v-1H`, which is a BSD/macOS flag and fails on typical Linux shells. Replaced it with GNU `date -d '1 hour ago'` for the Linux-style shell examples in the post.
- The psycopg2 retry example could return a failed connection to the pool before discarding it, and could attempt to return an unassigned connection if checkout failed. Updated the snippet to initialize `conn`, return it only after a successful query, and close/discard it on `OperationalError`.

## Review Notes
The AWS CLI binary was not installed in the local environment, so command validation was performed against the official AWS CLI Command Reference rather than local `aws --help` output. The related OneUptime links point to existing local post directories. The CloudWatch date command is now Linux-oriented; macOS users would need BSD `date` syntax or an alternative timestamp generator.
