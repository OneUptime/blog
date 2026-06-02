# Validation Summary: How to Resize (Scale Up) an RDS Instance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- AWS CLI
- Amazon CloudWatch metrics
- RDS Multi-AZ deployments
- RDS DB instance classes
- RDS storage types, including gp2 and gp3
- Python psycopg2 connection retries

## Sources Consulted
- AWS CLI Command Reference: modify-db-instance: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-instance.html
- AWS CLI Command Reference: get-metric-statistics: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- Amazon RDS User Guide: Settings for DB instances: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ModifyInstance.Settings.html
- Amazon RDS User Guide: Failing over a Multi-AZ DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- Amazon RDS User Guide: Converting a DB instance to a Multi-AZ deployment: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Migrating.html
- Amazon RDS FAQs: Multi-AZ deployments: https://aws.amazon.com/rds/faqs/
- Amazon RDS User Guide: DB instance classes: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html
- Amazon RDS User Guide: Amazon RDS DB instance storage: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html

## Issues Found
- The deferred resize command used `--apply-immediately false`, but AWS CLI boolean flags use `--apply-immediately` or `--no-apply-immediately`. Changed the command and related prose to use `--no-apply-immediately`.
- The CloudWatch examples used `date -v-24H` and `date -v-2H`, which are BSD/macOS date options and fail on common Linux environments such as AWS CloudShell. Changed them to GNU-compatible `date -u -d '24 hours ago'` and `date -u -d '2 hours ago'`.
- The Multi-AZ resize section claimed failover downtime of 20-30 seconds and described a second failover back to the original AZ. AWS documents typical Multi-AZ failover as 60-120 seconds and describes scaling as applying to the standby before automatic failover, without requiring an automatic failback. Updated the sequence and timing.
- The Single-AZ to Multi-AZ conversion note claimed a brief outage. AWS states this conversion should not incur downtime, though performance can be affected while the standby catches up. Updated the note.
- The storage section said all storage modifications have zero downtime. AWS documents no downtime for allocated storage increases, but some storage type transitions, especially to or from magnetic storage, can cause brief downtime. Narrowed the statement to allocated storage increases.

## Review Notes
The post is technically relevant and the remaining examples are consistent with AWS CLI documentation. Future improvements could mention that Graviton instance classes require engine and version compatibility checks, and that valid instance classes and gp3 performance ranges vary by engine and Region.
