# Validation Summary: How to Set Up Aurora Limitless Database for Horizontal Scaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Aurora PostgreSQL-Compatible Edition
- Aurora PostgreSQL Limitless Database
- AWS CLI
- Amazon RDS DB clusters and DB shard groups
- PostgreSQL SQL and DDL
- Amazon CloudWatch metrics

## Sources Consulted
- AWS Aurora User Guide: Creating your DB cluster for Aurora PostgreSQL Limitless Database - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-create-cluster.html
- AWS Aurora User Guide: Aurora PostgreSQL Limitless Database architecture - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-architecture.html
- AWS Aurora User Guide: Creating limitless tables by using variables - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-creating-config.html
- AWS Aurora User Guide: Converting standard tables to limitless tables - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-converting-standard.html
- AWS Aurora User Guide: Working with DB shard groups - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-shard.html
- AWS Aurora User Guide: Changing the capacity of a DB shard group - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-capacity.html
- AWS Aurora User Guide: Splitting a shard in a DB shard group - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-shard-split.html
- AWS Aurora User Guide: Monitoring Aurora PostgreSQL Limitless Database with Amazon CloudWatch - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/limitless-monitoring.cw.html

## Issues Found
- The architecture and table descriptions used "shard groups" where AWS documentation describes routers and shards inside a DB shard group. Updated the diagram and wording to distinguish DB shard groups from shards.
- The post said standard tables remain on the router. AWS documents that standard tables are stored on a system-chosen shard. Updated the table type and standard table wording.
- The cluster creation command omitted required Limitless CLI options for Performance Insights, Enhanced Monitoring, and PostgreSQL log exports. Added the documented flags and updated the example engine version to `16.6-limitless`.
- The post included a separate `create-db-instance` step for a router. AWS documents that Limitless routers and shards are contained in the DB shard group and are not visible as normal DB instances. Replaced this with a step to use the cluster endpoint from `describe-db-shard-groups`.
- The SQL examples used unsupported `USING aurora_limitless`, `ALTER TABLE ... SET SHARD KEY`, and `ALTER TABLE ... SET TABLE TYPE TO reference` syntax. Replaced them with the documented `rds_aurora.limitless_create_table_mode`, `rds_aurora.limitless_create_table_shard_key`, and `rds_aurora.limitless_create_table_collocate_with` session variables.
- The monitoring example used an undocumented `LimitlessQueryLatency` metric and `p99` in `--statistics`. Replaced it with the documented `DBShardGroupACUUtilization` metric and valid `Average,Maximum` statistics.
- The query insight examples referenced undocumented views. Replaced them with documented `rds_aurora.limitless_tables` and `rds_aurora.limitless_table_collocation_distributions` views.
- The scaling section implied that modifying shard group capacity changes the number of routers or shards and automatically rebalances data. AWS documents that changing capacity does not change the number of routers or shards. Updated the text to mention automatic or manual shard splitting separately.

## Review Notes
The tutorial is now technically aligned with the current AWS documentation reviewed on 2026-06-02. The local environment did not have the AWS CLI installed, so CLI validation was performed against AWS documentation rather than local `aws --help` output.
