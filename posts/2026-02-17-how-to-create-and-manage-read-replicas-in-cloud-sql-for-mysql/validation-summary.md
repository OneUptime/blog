# Validation Summary: How to Create and Manage Read Replicas in Cloud SQL for MySQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL for MySQL
- Cloud SQL read replicas and cross-region replicas
- Google Cloud CLI
- Cloud Monitoring alert policies
- Terraform Google provider
- MySQL replication status commands
- Python
- SQLAlchemy

## Sources Consulted
- Cloud SQL for MySQL: About replication in Cloud SQL: https://docs.cloud.google.com/sql/docs/mysql/replication
- Cloud SQL for MySQL: Create read replicas: https://docs.cloud.google.com/sql/docs/mysql/replication/create-replica
- Cloud SQL for MySQL: Replication lag: https://docs.cloud.google.com/sql/docs/mysql/replication/replication-lag
- Cloud SQL for MySQL: About read pools: https://docs.cloud.google.com/sql/docs/mysql/about-read-pools
- Google Cloud SDK: gcloud sql instances create: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud SDK: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Terraform Google provider: google_sql_database_instance: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- SQLAlchemy 2.0 Migration Guide: https://docs.sqlalchemy.org/20/changelog/migration_20.html
- Google Cloud Load Balancing backend service documentation: https://docs.cloud.google.com/load-balancing/docs/backend-service

## Issues Found
- The replication explanation described Cloud SQL as using generic MySQL binlog replication. Updated it to Cloud SQL's documented row-based replication with GTIDs and binary logs.
- The prerequisites claimed a `db-g1-small` or larger machine type was required and that shared-core instances do not support replicas. Replaced this with the documented requirement that at least one backup must be created after binary logging is enabled.
- The post omitted that enabling binary logging restarts the primary instance and that the first replica requires a post-binlog backup. Added a short note.
- The post said you can create up to 10 read replicas per primary. Updated this to Google's recommendation to limit direct read replicas to 10 or fewer.
- The MySQL status example used `SHOW SLAVE STATUS` and older field names. Updated the main example to `SHOW REPLICA STATUS` and current MySQL 8.0.22+ field names, with a compatibility note for older versions.
- The Cloud Monitoring alert command used non-existent `gcloud monitoring policies create` flags. Replaced them with the documented `--if` and `--duration` flags.
- The SQLAlchemy sample used `engine.execute()`, which is removed in SQLAlchemy 2.x. Updated it to execute through `Connection` objects and wrap raw SQL strings with `text()`.
- The best-practices section recommended putting replicas behind an internal TCP load balancer. Replaced this with application-side distribution, database-aware proxies, or Cloud SQL read pools because standalone Cloud SQL replicas are connected to directly and Google Cloud load balancer backends are instance groups or NEGs, not Cloud SQL instances directly.

## Review Notes
The Terraform snippet matches the documented Cloud SQL read replica resource pattern. The gcloud replica creation and promotion commands use current command names and flags, but actual execution was not possible in this workspace because `gcloud` is not installed.
