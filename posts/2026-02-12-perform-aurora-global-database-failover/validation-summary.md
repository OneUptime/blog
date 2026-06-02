# Validation Summary: How to Perform Aurora Global Database Failover

## Status
validated

## Post Type
Technical tutorial / disaster recovery guide

## Technologies Covered
- Amazon Aurora Global Database
- Amazon RDS and AWS CLI
- Boto3 for Python
- Amazon Route 53
- Amazon CloudWatch metrics
- RDS Proxy
- PyMySQL connection retry logic

## Sources Consulted
- AWS Aurora User Guide: Using switchover or failover in Amazon Aurora Global Database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- AWS Aurora User Guide: Removing a cluster from an Amazon Aurora global database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-detaching.html
- AWS Aurora User Guide: Connecting to Amazon Aurora Global Database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-connecting.html
- AWS Aurora User Guide: Using RDS Proxy with Aurora global databases - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/rds-proxy-gdb.html
- AWS CLI Command Reference: switchover-global-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/switchover-global-cluster.html
- AWS CLI Command Reference: failover-global-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/failover-global-cluster.html
- AWS CLI Command Reference: create-global-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/create-global-cluster.html
- Boto3 RDS Client: remove_from_global_cluster - https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/rds/client/remove_from_global_cluster.html

## Issues Found
- The post described Aurora Global Database as having only planned managed failover and unmanaged detach-and-promote. AWS now documents switchover, managed failover, and manual failover. Updated the terminology and flow to include managed failover as the recommended disaster recovery path and detach-and-promote as a fallback.
- The planned operation used `aws rds failover-global-cluster` without the newer recommended switchover command. Updated it to `aws rds switchover-global-cluster` and included the primary region in the example.
- The emergency section said managed failover would not work when the primary region is down. AWS documents managed failover as the recommended path for unplanned regional outages, so the section now shows `failover-global-cluster --allow-data-loss` before the manual detach process.
- The cleanup section implied the old global database could be deleted immediately after the old primary recovered. Updated the wording to state that all clusters must be removed from the old global database before deletion.
- The testing checklist used `AuroraGlobalDBReplicationLag` as the general current metric. Updated it to `AuroraGlobalDBRPOLag` for Aurora PostgreSQL global databases and newer Aurora MySQL global database versions, with `AuroraGlobalDBReplicationLag` retained for older Aurora MySQL versions.
- The endpoint guidance recommended Route 53 CNAMEs generally. Updated it to acknowledge the Aurora global writer endpoint and frame Route 53 updates as relevant when using CNAMEs instead.

## Review Notes
Python code blocks were syntax-checked successfully. AWS CLI is not installed in the local environment, so CLI examples were verified against official AWS CLI documentation rather than local `aws --help` output.
