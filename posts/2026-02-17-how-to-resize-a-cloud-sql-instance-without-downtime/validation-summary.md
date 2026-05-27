# Validation Summary: How to Resize a Cloud SQL Instance Without Downtime

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Google Cloud SQL
- gcloud CLI
- Cloud SQL high availability and read replicas
- Cloud Monitoring metrics
- Python
- SQLAlchemy

## Sources Consulted
- Google Cloud SDK reference: `gcloud sql instances patch` - https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Google Cloud SDK reference: `gcloud sql instances create` - https://cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud SDK reference: `gcloud sql instances promote-replica` - https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/promote-replica
- Cloud SQL for MySQL: Availability in Cloud SQL - https://docs.cloud.google.com/sql/docs/mysql/availability
- Cloud SQL for MySQL: About high availability - https://cloud.google.com/sql/docs/mysql/high-availability
- Cloud SQL for MySQL: About instance settings - https://docs.cloud.google.com/sql/docs/mysql/instance-settings
- Cloud SQL for MySQL: About storage shrink - https://docs.cloud.google.com/sql/docs/mysql/about-storage-shrink
- Cloud SQL for PostgreSQL: Manage read replicas / promote a replica - https://docs.cloud.google.com/sql/docs/postgres/replication/manage-replicas
- Cloud SQL for MySQL: Replication lag - https://docs.cloud.google.com/sql/docs/mysql/replication/replication-lag
- Cloud SQL for MySQL: Read pool autoscaling - https://docs.cloud.google.com/sql/docs/mysql/read-pool-autoscaling
- SQLAlchemy 2.0: Working with Engines and Connections - https://docs.sqlalchemy.org/20/core/connections.html

## Issues Found
- The post said storage could never be decreased. Current Cloud SQL documentation supports storage shrink for supported instances, but it requires downtime and a restart. Updated the storage sections to distinguish zero-downtime increases from downtime-requiring shrink operations.
- The automatic storage increase example used `gcloud sql instances patch --storage-auto-increase-limit`. Current docs list the limit flag for `gcloud beta sql instances patch` on existing instances. Updated the command accordingly.
- The post said automatic storage increase happens at 90% utilization. Current docs describe a storage-type-specific free-space threshold checked every 30 seconds. Replaced the fixed 90% claim with the documented threshold behavior.
- Machine resize examples used `--tier=db-custom-*` for dedicated-core custom sizing. Current gcloud docs direct users to use `--cpu` and `--memory` for custom machine types outside Enterprise Plus. Updated resize commands and sizing examples.
- The blue-green replica strategy claimed true zero downtime and easy rollback after promotion. Cloud SQL documentation says writes should be stopped before promotion until replica lag reaches zero, and promotion stops replication. Updated the section to describe near-zero downtime with a brief write pause and rollback before promotion.
- The replica catch-up example inspected `replicaConfiguration`, which does not show lag directly. Replaced it with a Cloud Monitoring `replica_lag` metric example.
- SQLAlchemy examples used raw strings with `Connection.execute()`. SQLAlchemy 2.0 requires an executable SQL construct such as `text()` for that API. Updated both examples to import and use `sqlalchemy.text()`.
- The automated scaling section said Cloud SQL has no built-in autoscaling. Current Cloud SQL documentation includes read pool autoscaling, but not automatic primary instance machine-type scaling. Updated the sentence to make that distinction.
- The summary repeated the "true zero downtime" claim for read-replica blue-green. Updated it to describe HA / Enterprise Plus near-zero-downtime scaling and controlled replica cutover.

## Review Notes
- The cost table remains approximate as stated in the post; actual pricing varies by region, edition, database engine, and storage/network choices.
- The automated scaling example is intentionally simplified. Production automation should add idempotency, operation-state checks, alert dampening, and explicit safeguards for scale-down frequency and maintenance impact.
