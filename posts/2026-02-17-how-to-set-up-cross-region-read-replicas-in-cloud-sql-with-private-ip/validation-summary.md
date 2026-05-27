# Validation Summary: How to Set Up Cross-Region Read Replicas in Cloud SQL with Private IP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud SQL
- Cloud SQL read replicas and cross-region replicas
- Cloud SQL private IP and Private Service Access
- Google Cloud CLI
- Cloud Monitoring alerting policies
- PostgreSQL replication lag queries
- MySQL replica status queries

## Sources Consulted
- Google Cloud SQL for PostgreSQL: About replication in Cloud SQL: https://docs.cloud.google.com/sql/docs/postgres/replication
- Google Cloud SQL for PostgreSQL: Create read replicas: https://docs.cloud.google.com/sql/docs/postgres/replication/create-replica
- Google Cloud SQL for PostgreSQL: Configure private IP: https://docs.cloud.google.com/sql/docs/postgres/configure-private-ip
- Google Cloud SQL for PostgreSQL: Learn about using private IP: https://docs.cloud.google.com/sql/docs/postgres/private-ip
- Google Cloud SQL for PostgreSQL: Replication lag: https://docs.cloud.google.com/sql/docs/postgres/replication/replication-lag
- Google Cloud SQL for PostgreSQL: Manage read replicas: https://docs.cloud.google.com/sql/docs/postgres/replication/manage-replicas
- Google Cloud SQL for MySQL: Manage read replicas: https://docs.cloud.google.com/sql/docs/mysql/replication/manage-replicas
- Google Cloud SDK: gcloud sql instances create: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud SDK: gcloud beta sql instances create: https://docs.cloud.google.com/sdk/gcloud/reference/beta/sql/instances/create
- Google Cloud SDK: gcloud services vpc-peerings update: https://docs.cloud.google.com/sdk/gcloud/reference/services/vpc-peerings/update
- Google Cloud SDK: gcloud monitoring policies create: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- MySQL 8.0 Reference Manual: SHOW REPLICA STATUS Statement: https://dev.mysql.com/doc/refman/8.0/en/show-replica-status.html
- Google Cloud SQL pricing: https://cloud.google.com/sql/pricing

## Issues Found
- The post said cross-region replicas with private IP require Private Service Access in both regions. Cloud SQL documentation says a replica inherits private IP connectivity from the primary instance and does not need an additional VPC private connection. Updated the prerequisites, Step 1 title, Step 1 explanation, network architecture text, and summary.
- The post implied the default cross-region replica setup uses public IP and replication traffic flows over the internet. Updated this to explain that replicas inherit private IP from the primary and that public IP should be disabled when private client connectivity is required.
- The `--allocated-ip-range-name` flag was used with stable `gcloud sql instances create`, but the current stable gcloud reference does not list that flag. The beta gcloud reference does list it, so the command now uses `gcloud beta sql instances create` where that flag is used.
- The replication status check used a MySQL-specific `replicaConfiguration.mysqlReplicaConfiguration` projection in a post that otherwise uses PostgreSQL examples. Changed it to the generic `replicaConfiguration` field.
- The MySQL status query used deprecated `SHOW SLAVE STATUS`. Updated it to `SHOW REPLICA STATUS` for MySQL 8.0.22 and later.
- The Cloud Monitoring alert command used non-current flags `--condition-threshold-value` and `--condition-threshold-duration`. Updated the command to use `--if='> 60'` and `--duration=300s` per the current gcloud reference.
- The promotion warning said replication cannot be re-established. Promotion stops replication and converts the replica to a standalone primary; the original replication link is not kept. Updated the warning to avoid overstating the behavior.
- The cost section said Google does not charge for replication traffic within Google's network. Cloud SQL documentation says cross-region replicas incur data transfer charges for replication logs. Updated the cost bullet.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was done against the current official Google Cloud SDK command reference instead of local `--help` output.
