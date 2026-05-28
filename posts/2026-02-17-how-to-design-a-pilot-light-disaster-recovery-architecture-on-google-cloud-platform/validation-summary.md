# Validation Summary: How to Design a Pilot Light Disaster Recovery Architecture

## Status
validated

## Post Type
Tutorial / architecture guide

## Technologies Covered
- Google Cloud Platform
- Cloud SQL for PostgreSQL
- Cloud Storage and Storage Transfer Service
- Artifact Registry
- Terraform Google provider
- Cloud Build
- Google Kubernetes Engine
- Cloud DNS
- Cloud Monitoring
- Secret Manager

## Sources Consulted
- Google Cloud CLI reference: gcloud sql instances create - https://cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Google Cloud CLI reference: gcloud sql instances patch - https://cloud.google.com/sdk/gcloud/reference/sql/instances/patch
- Cloud SQL for PostgreSQL read replica documentation - https://cloud.google.com/sql/docs/postgres/replication/create-replica
- Cloud SQL for PostgreSQL high availability documentation - https://cloud.google.com/sql/docs/postgres/high-availability
- Cloud Storage bucket creation documentation - https://cloud.google.com/storage/docs/creating-buckets
- Cloud Storage bucket locations documentation - https://cloud.google.com/storage/docs/bucket-locations
- Cloud Storage availability, durability, and turbo replication documentation - https://cloud.google.com/storage/docs/availability-durability
- Google Cloud CLI reference: gcloud storage buckets create - https://cloud.google.com/sdk/gcloud/reference/storage/buckets/create
- Google Cloud CLI reference: gcloud transfer jobs create - https://cloud.google.com/sdk/gcloud/reference/transfer/jobs/create
- Storage Transfer Service transfer documentation - https://cloud.google.com/storage-transfer/docs/create-transfers
- Cloud Build deploying to GKE documentation - https://cloud.google.com/build/docs/deploying-builds/deploy-gke
- Google Cloud CLI reference: gcloud monitoring uptime create - https://cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Cloud Monitoring uptime check documentation - https://cloud.google.com/monitoring/uptime-checks
- Google Cloud CLI reference: gcloud monitoring policies create - https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud CLI reference: gcloud dns record-sets update - https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/update

## Issues Found
- The post described pilot light RPO as "near zero" solely because replication is continuous. Cloud SQL cross-region read replicas are asynchronous, so RPO depends on replication lag. Updated the wording to say RPO is low but dependent on replication lag.
- The Cloud Storage bucket creation example used `gsutil mb --placement`, but current Google Cloud documentation shows the `us-central1` and `us-east1` pair as the predefined `NAM4` dual-region. Updated the command to create the bucket with `gcloud storage buckets create --location=NAM4`.
- The Storage Transfer Service example included `--source-agent-pool=default` for a Cloud Storage-to-Cloud Storage transfer. Google Cloud documentation states these transfers do not require agents or agent pools. Removed the flag.
- The post claimed Cloud Storage turbo replication provides sub-15-second RPO. Official Cloud Storage documentation states turbo replication provides a 15-minute RPO. Updated the claim.
- The `gcloud monitoring uptime create` example used unsupported flags such as `--display-name`, `--uri`, and `--http-method`. Updated it to use the positional display name, `uptime-url` resource labels, HTTPS protocol, path, valid request method, period, timeout, and checker region values.
- The alerting policy example used obsolete/nonexistent threshold flags. Updated it to the current `gcloud monitoring policies create` syntax with aggregation, `--if="< 1"`, and `--duration=120s`.

## Review Notes
- The Cloud SQL failover flow is directionally correct, but real deployments should test the time required to promote a replica, resize the instance, and enable high availability because those operations can take minutes and may restart the instance.
- The cost table is illustrative only; actual costs vary by region, edition, storage size, network egress, GKE mode, and committed use discounts.
