# Validation Summary: How to Set Up Cross-Region Replication in AlloyDB for Disaster Recovery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud AlloyDB for PostgreSQL
- AlloyDB cross-region replication
- Google Cloud CLI
- Private Services Access
- Private Service Connect
- Cloud Monitoring
- Disaster recovery, RPO, and RTO

## Sources Consulted
- Google Cloud AlloyDB cross-region replication overview: https://cloud.google.com/alloydb/docs/cross-region-replication/about-cross-region-replication
- Google Cloud AlloyDB cross-region replication operations guide: https://cloud.google.com/alloydb/docs/cross-region-replication/work-with-cross-region-replication
- Google Cloud SDK reference for `gcloud alloydb clusters create-secondary`: https://cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create-secondary
- Google Cloud SDK reference for `gcloud alloydb instances create-secondary`: https://cloud.google.com/sdk/gcloud/reference/alloydb/instances/create-secondary
- Google Cloud SDK reference for `gcloud alpha monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Google Cloud Monitoring metrics list for AlloyDB: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- Google Cloud VPC Private Services Access configuration guide: https://cloud.google.com/vpc/docs/configure-private-services-access
- Google Cloud AlloyDB pricing: https://cloud.google.com/alloydb/pricing

## Issues Found
- The post described cross-region replication as having automated failover capabilities. AlloyDB cross-region disaster recovery uses promotion, and planned drills can use switchover, so the description was corrected.
- The post said Private Services Access must be configured in both primary and secondary regions. Private Services Access is configured for the VPC network with global allocated ranges and VPC peering, so the prerequisite and setup section were corrected.
- The secondary cluster command used `gcloud alloydb clusters create` with `--secondary-config-primary-cluster-name`. Current Google Cloud CLI documentation uses `gcloud alloydb clusters create-secondary` with `--primary-cluster`, so both secondary cluster creation examples were updated.
- The secondary instance command used `gcloud alloydb instances create --instance-type=SECONDARY --cpu-count=4`. Current documentation uses `gcloud alloydb instances create-secondary`; scaling is done with `gcloud alloydb instances update --cpu-count`, so the example was corrected.
- The post claimed replication lag could be checked from the primary cluster's `primaryConfig`. The official workflow checks the secondary instance Monitoring charts, so that text was corrected.
- The testing section used promotion as the primary DR drill flow. Promotion makes the secondary an independent primary, while switchover is the current zero-data-loss planned drill mechanism, so switchover guidance and command were added.
- The Monitoring alert used a non-existent metric type, `alloydb.googleapis.com/database/replication/replica_lag`, and obsolete threshold flags. It was changed to the documented AlloyDB node replication lag metric, `alloydb.googleapis.com/node/postgres/replay_lag`, with current `gcloud alpha monitoring policies create` flags.
- The RPO guidance suggested continuous backups to Cloud Storage for near-zero RPO. Backups and PITR help with recovery from corruption or accidental changes, but switchover is the near-zero RPO option for planned operations; the text was corrected.
- The cost section stated that cross-region replication roughly doubles costs and specifically charges cross-region replication egress. The pricing documentation is broader and describes applicable data transfer out charges, so the wording was made less absolute.

## Review Notes
The post still gives example resource names and regions that users must replace for their own projects. The Cloud Monitoring alert is intentionally generic; production users should add project, cluster, instance, or node label filters to avoid alerting on unrelated AlloyDB nodes in the same project.
