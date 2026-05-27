# Validation Summary: How to Promote an AlloyDB Secondary Cluster During a Regional Outage

## Status
validated

## Post Type
Tutorial / Disaster recovery guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- AlloyDB cross-region replication
- AlloyDB secondary cluster promotion
- Google Cloud CLI
- Cloud Monitoring alerting policies
- Cloud DNS
- Private IP connectivity

## Sources Consulted
- Google Cloud AlloyDB cross-region replication overview: https://cloud.google.com/alloydb/docs/cross-region-replication/about-cross-region-replication
- Google Cloud AlloyDB work with cross-region replication: https://cloud.google.com/alloydb/docs/cross-region-replication/work-with-cross-region-replication
- Google Cloud SDK reference for `gcloud alloydb clusters create-secondary`: https://cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create-secondary
- Google Cloud SDK reference for `gcloud alloydb instances create-secondary`: https://cloud.google.com/sdk/gcloud/reference/alloydb/instances/create-secondary
- Google Cloud SDK reference for `gcloud alloydb clusters promote`: https://cloud.google.com/sdk/gcloud/reference/alloydb/clusters/promote
- Google Cloud SDK reference for `gcloud alloydb instances create`: https://cloud.google.com/sdk/gcloud/reference/alloydb/instances/create
- Google Cloud Monitoring metrics list for AlloyDB metrics: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud SDK reference for `gcloud dns record-sets update`: https://cloud.google.com/sdk/gcloud/reference/dns/record-sets/update
- Google Cloud AlloyDB Private Service Connect documentation: https://cloud.google.com/alloydb/docs/configure-private-service-connect

## Issues Found
- The secondary cluster creation command used `gcloud alloydb clusters create` with unsupported secondary-cluster flags. Updated it to `gcloud alloydb clusters create-secondary`, which is the documented command for creating AlloyDB secondary clusters.
- The secondary instance creation command used `gcloud alloydb instances create --instance-type=SECONDARY --cpu-count=4`. Updated it to `gcloud alloydb instances create-secondary`, which is the documented command for secondary instances.
- The Cloud Monitoring alert example used a non-current metric path and old threshold flags. Updated the metric to `alloydb.googleapis.com/instance/postgres/replication/maximum_secondary_lag`, changed the threshold to `> 30000` because the metric is reported in milliseconds, and used the current `gcloud monitoring policies create` flag shape.
- The outage check comment said the command connects to the primary. Adjusted it to say it reaches the primary cluster, because the command checks the AlloyDB control plane resource state rather than opening a database connection.
- The promotion explanation implied AlloyDB applies all remaining WAL records during promotion. Adjusted the wording to avoid implying zero data loss when the primary region is unavailable and unreplicated writes might exist.
- The application update section grouped Private Service Connect with Private IP for direct instance IP updates. Removed the Private Service Connect reference from that sentence because PSC uses endpoint-specific connection details and DNS patterns.
- The post-failback secondary creation command had the same unsupported `clusters create` flags as the initial setup command. Updated it to `gcloud alloydb clusters create-secondary`.

## Review Notes
- Google Cloud documentation recommends checking replication lag and status before promotion when possible. During a true regional outage, the primary might be unreachable, so recent committed transactions can still be lost because cross-region replication is asynchronous.
- For planned DR drills or regional migration, AlloyDB also supports switchover with zero data loss. The post's promotion-focused drill remains technically valid, but switchover is usually the better fit for planned testing.
