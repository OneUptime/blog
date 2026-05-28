# Validation Summary: How to Debug Serverless VPC Access Connector Throughput Bottlenecks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Serverless VPC Access
- Google Cloud Run
- Google Cloud Functions
- Google Cloud Monitoring
- Google Cloud CLI
- Cloud SQL Python Connector
- SQLAlchemy

## Sources Consulted
- Google Cloud Serverless VPC Access overview and throughput table: https://docs.cloud.google.com/vpc/docs/serverless-vpc-access
- Google Cloud Serverless VPC Access configuration and connector update documentation: https://docs.cloud.google.com/vpc/docs/configure-serverless-vpc-access
- Google Cloud CLI reference for `gcloud compute networks vpc-access connectors update`: https://cloud.google.com/sdk/gcloud/reference/compute/networks/vpc-access/connectors/update
- Google Cloud Monitoring metrics list for VPC Access connector metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Cloud Run Direct VPC egress documentation: https://cloud.google.com/run/docs/configuring/vpc-direct-vpc
- Cloud Run migration from connector to Direct VPC egress: https://docs.cloud.google.com/run/docs/configuring/migrate-direct-vpc
- Cloud SQL Python Connector with SQLAlchemy sample: https://docs.cloud.google.com/sql/docs/postgres/samples/cloud-sql-postgres-sqlalchemy-connect-connector
- Cloud SQL connector documentation for PostgreSQL: https://docs.cloud.google.com/sql/docs/postgres/connect-connectors

## Issues Found
- Corrected the default Serverless VPC Access throughput claim from 200-300 Mbps to the current estimated 200-1,000 Mbps range for e2-micro connectors.
- Corrected the throughput table to describe connector throughput ranges instead of per-instance throughput, and updated e2-standard-4 to 3,200-16,000 Mbps.
- Corrected the autoscaling explanation: connectors scale up by adding instances, but do not scale back down automatically.
- Corrected the statement that connector machine type cannot be changed. Current Google Cloud documentation supports updating connector machine type.
- Replaced the invalid guidance to use a `/24` connector range and `--max-instances=20`; Serverless VPC Access connector ranges are `/28`, and maximum instances are limited to 10.
- Added `--clear-vpc-connector` to the Direct VPC egress migration command so an existing Cloud Run service actually stops using its connector.
- Corrected the Cloud SQL pooling explanation: the Cloud SQL Python Connector opens connections, while SQLAlchemy manages the connection pool.

## Review Notes
The Google Cloud CLI was not installed in the local environment, so command validation was performed against official Google Cloud CLI and product documentation instead of local `gcloud --help` output.
