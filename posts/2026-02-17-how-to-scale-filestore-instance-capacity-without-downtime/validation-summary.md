# Validation Summary: How to Scale Filestore Instance Capacity Without Downtime

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Google Cloud Filestore
- Google Cloud CLI
- Cloud Monitoring alerting policies and metrics
- Cloud Functions
- Python Google Cloud Filestore client library
- NFS client capacity checks

## Sources Consulted
- Google Cloud Filestore scale capacity documentation: https://docs.cloud.google.com/filestore/docs/scale
- Google Cloud Filestore service tiers documentation: https://docs.cloud.google.com/filestore/docs/service-tiers
- Google Cloud Filestore performance documentation: https://docs.cloud.google.com/filestore/docs/performance
- Google Cloud Filestore monitoring documentation: https://docs.cloud.google.com/filestore/docs/monitoring-instances
- Google Cloud Monitoring metric reference for Filestore metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_d_h
- Google Cloud Monitoring monitored resource types: https://docs.cloud.google.com/monitoring/api/resources
- Google Cloud SDK reference for `gcloud filestore instances update`: https://cloud.google.com/sdk/gcloud/reference/filestore/instances/update
- Google Cloud SDK reference for `gcloud alpha monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Python client reference for `CloudFilestoreManagerClient.update_instance`: https://docs.cloud.google.com/python/docs/reference/file/latest/google.cloud.filestore_v1.services.cloud_filestore_manager.CloudFilestoreManagerClient

## Issues Found
- Basic HDD and Basic SSD were described as supporting scale-down. Current Filestore documentation says Basic HDD and Basic SSD are scale-up only, so the scale-down section and example were corrected.
- Several capacity units used `GB`/`TB`. Filestore documentation and gcloud examples use `GiB`/`TiB`, so the commands and tier descriptions were updated.
- The post stated broadly that zonal and regional performance scales with capacity. Current documentation says zonal and regional tiers can use custom performance, which lets IOPS be configured independently from capacity. The performance claims were narrowed to enterprise and capacity-based performance configurations.
- The monitoring filter used `resource.type="filestore.googleapis.com/Instance"`. Cloud Monitoring uses the monitored resource type `filestore_instance` for Filestore metrics, so both filters were corrected.
- The alerting policy command used unsupported flags `--condition-threshold-value` and `--condition-threshold-comparison`. The command was updated to use the current `--if='> 80'` and `--duration` flags.
- The minimum scaling increment list was inaccurate for several tiers and omitted the separate lower and higher capacity ranges for zonal and regional instances. The list was updated to match the current scale-capacity documentation.

## Review Notes
The Python client-library example uses the current `google.cloud.filestore_v1.CloudFilestoreManagerClient.update_instance` method and the `file_shares` update mask. In production, automation should also account for quotas, long-running operations, concurrent Filestore edits, and each tier's valid capacity range before submitting an update.
