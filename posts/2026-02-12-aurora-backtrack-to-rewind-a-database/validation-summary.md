# Validation Summary: How to Use Aurora Backtrack to Rewind a Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Aurora MySQL-Compatible Edition
- Aurora Backtrack
- Amazon RDS
- AWS CLI
- Amazon CloudWatch metrics
- Python and boto3

## Sources Consulted
- Amazon Aurora User Guide: Backtracking an Aurora DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.html
- Amazon Aurora User Guide: Configuring backtracking an Aurora MySQL DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.Configuring.html
- Amazon Aurora User Guide: Performing a backtrack for an Aurora MySQL DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.Performing0.html
- Amazon Aurora User Guide: Monitoring backtracking for an Aurora MySQL DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraMySQL.Managing.Backtrack.Monitoring.html
- AWS CLI Command Reference: create-db-cluster: https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-cluster.html
- AWS CLI Command Reference: modify-db-cluster: https://docs.aws.amazon.com/cli/latest/reference/rds/modify-db-cluster.html
- AWS CLI Command Reference: backtrack-db-cluster: https://docs.aws.amazon.com/cli/latest/reference/rds/backtrack-db-cluster.html
- Amazon Aurora User Guide: Aurora MySQL version 2 end of standard support: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.MySQL57.EOL.html
- Amazon Aurora pricing: https://aws.amazon.com/rds/aurora/pricing/

## Issues Found
- The post said Backtrack could be enabled by modifying any existing cluster. AWS documents that you can only modify the backtrack window for a cluster that was already created with Backtrack enabled; a cluster created with Backtrack disabled can't have it enabled later. Updated the explanation and the existing-cluster CLI example wording.
- The create-cluster command used Aurora MySQL version `5.7.mysql_aurora.2.11.2`, which is an Aurora MySQL version 2 release. Aurora MySQL version 2 reached end of standard support on October 31, 2024. Removed the pinned outdated engine version from the example.
- The post described Backtrack as taking seconds and said the cluster is usually unavailable for only a few seconds. AWS documentation describes Backtrack as a quick operation measured in minutes and notes that Aurora pauses the database, closes open connections, and drops uncommitted reads and writes. Updated the timing and disruption descriptions.
- The console procedure didn't match the current AWS documentation. Updated it to select the primary DB instance and use **Backtrack DB cluster**.
- The post said `--force` skips confirmation. AWS CLI documentation says `--force` forces a backtrack when binary logging is enabled; otherwise an error occurs. Updated the explanation and added the binlog risk.
- The post gave an unsupported 5-10% storage-cost rule of thumb. AWS pricing documents that Backtrack cost is based on stored change records, workload, and the target backtrack window. Replaced the fixed percentage with workload-based wording.
- The limitations section said you can't backtrack past dropping a table. AWS documentation says Aurora keeps deleted tables in backtrack change records when possible, and the documented limitations are whole-cluster scope, brief disruption, binlog interactions, clone timing, Region support, and upgrade boundaries. Replaced that claim with documented limitations.

## Review Notes
The AWS CLI and boto3 backtrack examples use valid operation names and parameters. The CloudWatch metric names in the post match the metrics documented for Aurora Backtrack. The internal OneUptime links point to existing local posts in this repository.
