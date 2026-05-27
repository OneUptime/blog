# Validation Summary: How to Set Up Replication Between Bigtable Clusters for High Availability

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Bigtable
- Bigtable replication
- Bigtable app profiles and routing policies
- Google Cloud CLI
- Cloud Monitoring
- Python Bigtable client library
- Java Bigtable client library

## Sources Consulted
- Google Cloud Bigtable replication overview: https://docs.cloud.google.com/bigtable/docs/replication-overview
- Google Cloud Bigtable routing options: https://cloud.google.com/bigtable/docs/routing
- Google Cloud Bigtable app profiles overview: https://docs.cloud.google.com/bigtable/docs/app-profiles
- Google Cloud Bigtable create and configure app profiles: https://docs.cloud.google.com/bigtable/docs/configuring-app-profiles
- Google Cloud Bigtable create an instance: https://docs.cloud.google.com/bigtable/docs/creating-instance
- Google Cloud SDK reference for `gcloud bigtable instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/bigtable/instances/create
- Google Cloud SDK reference for `gcloud bigtable clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/bigtable/clusters/create
- Google Cloud SDK reference for `gcloud bigtable clusters update`: https://cloud.google.com/sdk/gcloud/reference/bigtable/clusters/update
- Google Cloud Bigtable metrics reference: https://docs.cloud.google.com/bigtable/docs/metrics
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Bigtable writes and conflict resolution: https://cloud.google.com/bigtable/docs/writes
- Python Bigtable `Instance.table` reference: https://cloud.google.com/python/docs/reference/bigtable/latest/google.cloud.bigtable.instance.Instance
- Java Bigtable `BigtableDataSettings.Builder` reference: https://docs.cloud.google.com/java/docs/reference/google-cloud-bigtable/latest/com.google.cloud.bigtable.data.v2.BigtableDataSettings.Builder

## Issues Found
- The post implied application failover happens transparently for any replicated instance. Updated the wording to clarify that automatic failover applies when applications use multi-cluster routing.
- The replication explanation said Bigtable replicates all writes to both clusters. Updated it to say Bigtable starts replicating changes between clusters and propagates writes asynchronously from the cluster that receives the write.
- The instance creation example used the deprecated `--instance-type=PRODUCTION` flag. Removed the flag because Bigtable instances are production instances by default and the Cloud SDK now marks `--instance-type` as deprecated.
- The app profile section said multi-cluster routing is always the default. Updated it to clarify that this is the default only for instances created with two or more clusters.
- The conflict-resolution section incorrectly described last-write-wins as based on the cell timestamp. Updated it to Bigtable's documented behavior: conflicts for the same row key, column family, column qualifier, and timestamp are resolved using an internal last-write-wins algorithm based on server-side time.
- The Python conflict example used `datetime.datetime.utcnow()` without importing `datetime`. Added the import and changed the timestamp expression to `datetime.datetime.now(datetime.timezone.utc)`.
- The Cloud Monitoring alert example used invalid `gcloud monitoring policies create` flags, `--condition-threshold-value` and `--condition-threshold-duration`. Replaced them with the current `--if="> 10"` and `--duration=300s` flags.
- The replication delay alert filter used `resource.type="bigtable_cluster"`, but the `replication/max_delay` metric is reported on the `bigtable_table` monitored resource. Updated the filter accordingly.

## Review Notes
The installed environment did not include `gcloud`, so CLI examples were checked against the official Google Cloud SDK reference instead of local `--help` output.
