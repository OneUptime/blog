# Validation Summary: How to Migrate from AWS to GCP

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS EC2, EKS, S3, RDS, DynamoDB, SQS, SNS, Lambda, CloudFront, Route 53
- Google Cloud Compute Engine, GKE, Cloud Storage, Cloud SQL, Firestore, Bigtable, Pub/Sub, Cloud Functions, Cloud CDN, Cloud DNS
- Google Cloud CLI, AWS CLI, gsutil, kubectl
- PostgreSQL, pg_dump
- Kubernetes manifests
- Python

## Sources Consulted
- Google Cloud CLI reference: `gcloud compute vpn-tunnels create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/vpn-tunnels/create
- Google Cloud CLI reference: `gcloud compute external-vpn-gateways create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/external-vpn-gateways/create
- Google Cloud CLI reference: `gcloud compute routers create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/routers/create
- Google Cloud CLI reference: `gcloud transfer jobs create` - https://docs.cloud.google.com/sdk/gcloud/reference/transfer/jobs/create
- Google Cloud CLI reference: `gcloud sql instances create` - https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud CLI reference: `gcloud database-migration migration-jobs create` - https://docs.cloud.google.com/sdk/gcloud/reference/database-migration/migration-jobs/create
- Google Cloud CLI reference: `gcloud container clusters create` - https://docs.cloud.google.com/sdk/gcloud/reference/container/clusters/create
- Google Cloud CLI reference: `gcloud compute interconnects attachments dedicated create` - https://docs.cloud.google.com/sdk/gcloud/reference/compute/interconnects/attachments/dedicated/create
- Google Cloud CLI reference: `gcloud dns record-sets create` and `update` - https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/create and https://docs.cloud.google.com/sdk/gcloud/reference/dns/record-sets/update
- Google Cloud CLI reference: `gcloud monitoring uptime create` - https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Cloud SQL for PostgreSQL import/export documentation - https://docs.cloud.google.com/sql/docs/postgres/import-export/import-export-sql
- AWS RDS snapshot export documentation - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ExportSnapshot.html
- AWS CLI RDS `start-export-task` reference - https://docs.aws.amazon.com/cli/latest/reference/rds/start-export-task.html

## Issues Found
- The HA VPN tunnel example used `--peer-gcp-gateway`, which is for another Google Cloud HA VPN gateway, not AWS. It also used the wrong HA VPN interface flag. Changed the example to create an external VPN gateway for AWS, create the required Cloud Router, and use `--peer-external-gateway`, `--peer-external-gateway-interface`, and `--interface`.
- The Storage Transfer Service example used `--schedule-repeats-every=0` for a one-time transfer. Current CLI documentation supports omitting schedule flags for an immediate one-time job, so the invalid repeat interval was removed.
- The RDS-to-Cloud SQL example exported an RDS snapshot to S3 and then imported `export.sql` into Cloud SQL. RDS snapshot export produces Apache Parquet files, not a SQL dump. Replaced this with a PostgreSQL `pg_dump` workflow staged through Cloud Storage.
- The Cloud SQL create example used `--tier=db-custom-4-16384` and `--storage-size=100GB`. Current gcloud documentation recommends `--cpu` and `--memory` for custom instances and specifies storage size as an integer number of GB, so those flags were updated.
- The Cloud DNS weighted routing example used placeholder labels as RR data and the deprecated `--routing-policy-data` flag with reversed `weight=rrdata` formatting. Updated it to use current `--routing-policy-item` syntax and documentation IP placeholders.
- The uptime check example used `gcloud monitoring uptime-check-configs create` and flags that do not match the current Google Cloud CLI surface. Updated it to `gcloud monitoring uptime create` with `--resource-labels`, `--protocol`, `--port`, `--path`, and `--period`.

## Review Notes
- The service mapping table is a useful high-level planning aid, but several mappings are conceptual rather than one-to-one replacements, especially SQS/SNS to Pub/Sub, DynamoDB to Firestore/Bigtable, and CloudFront to Cloud CDN.
- The Cloud Functions example uses the older background function shape for Cloud Storage events. It remains recognizable for legacy functions, but a future refresh could show the CloudEvents signature used by Cloud Run functions.
