# Validation Summary: How to Use RDS Blue/Green Deployments for Zero-Downtime Upgrades

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS Blue/Green Deployments
- Amazon Aurora Blue/Green Deployments
- AWS CLI
- Amazon CloudWatch metrics
- RDS for MySQL, MariaDB, and PostgreSQL
- Aurora MySQL and Aurora PostgreSQL
- Python with PyMySQL

## Sources Consulted
- Amazon RDS User Guide: Using Amazon RDS Blue/Green Deployments for database updates: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html
- Amazon RDS User Guide: Supported Regions and DB engines for Amazon RDS Blue/Green Deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.RDS_Fea_Regions_DB-eng.Feature.BlueGreenDeployments.html
- Amazon RDS User Guide: Creating a blue/green deployment in Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-creating.html
- Amazon RDS User Guide: Switching a blue/green deployment in Amazon RDS: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-switching.html
- Amazon RDS User Guide: Limitations and considerations for Amazon RDS blue/green deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-considerations.html
- Amazon RDS User Guide: PostgreSQL replication methods for blue/green deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-replication-type.html
- Amazon Aurora User Guide: Overview of Amazon Aurora Blue/Green Deployments: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/blue-green-deployments-overview.html
- AWS CLI Command Reference: create-blue-green-deployment: https://docs.aws.amazon.com/cli/latest/reference/rds/create-blue-green-deployment.html
- AWS CLI Command Reference: delete-blue-green-deployment: https://docs.aws.amazon.com/cli/latest/reference/rds/delete-blue-green-deployment.html
- PyMySQL documentation: Connection Object: https://pymysql.readthedocs.io/en/latest/modules/connections.html
- PyMySQL documentation: Cursor Objects: https://pymysql.readthedocs.io/en/latest/modules/cursors.html

## Issues Found
- The post stated that all blue/green deployments stay in sync through logical replication. AWS documents that RDS for PostgreSQL primarily uses physical replication, uses logical replication only for specific major upgrades, and other engines use engine-specific replication. Updated the wording to "managed replication" and added engine-specific caveats.
- The supported PostgreSQL wording included an unsupported historical note and omitted the current supported lower bound. Updated it to RDS PostgreSQL 11.1 and higher, and added RDS MySQL 8.4.
- The prerequisites implied binary logging is required for RDS MySQL/MariaDB and logical replication for all PostgreSQL deployments. AWS documents automated backups for RDS MySQL/MariaDB, physical versus logical PostgreSQL preparation, and binary logging for Aurora MySQL. Updated the prerequisite list accordingly.
- The CloudWatch `date` command used macOS/BSD `date -v-1H`, which fails on typical Linux shells used with AWS CLI examples. Replaced it with GNU `date -d '1 hour ago'`.
- The replication lag example used `ReplicaLag` generally. AWS documents that PostgreSQL uses different monitoring depending on physical or logical replication. Added a note for PostgreSQL logical and physical replication monitoring.
- The Python testing snippet used `psycopg2` while the surrounding upgrade example was MySQL. Replaced it with PyMySQL and corrected the connection parameter to `database`.
- The switchover section implied applications automatically reconnect and that downtime is mostly DNS propagation. AWS documents that connections are dropped and that workload, replication lag, and client DNS caching can affect downtime. Updated the text to mention reconnect/retry behavior and DNS caching more accurately.
- The rollback section implied the old blue instance could simply receive traffic again. AWS documents that old blue resources are retained but read-only until the relevant MySQL or PostgreSQL parameter is changed and the instance is rebooted. Added that caveat.
- The delete command used `--delete-target false`, which is not a valid AWS CLI boolean form. It also attempted to specify target deletion after switchover, which AWS CLI does not allow for `SWITCHOVER_COMPLETED` deployments. Replaced it with the valid post-switchover delete command.
- The old blue instance identifier example used an inaccurate suffix. Updated it to the AWS-documented `-old1` naming pattern.
- The schema change limitation was too broad for PostgreSQL physical replication, where the green environment is read-only. Added the mode-specific caveat.

## Review Notes
The post is technically relevant and useful after the corrections. Future improvements could include separate MySQL and PostgreSQL walkthroughs, because the operational details for replication lag, schema changes, and green-environment writes differ substantially by engine and replication method.
