# Validation Summary: How to Back Up and Restore Loki Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Loki ruler API
- Loki TSDB and object storage
- AWS S3 and AWS CLI
- Google Cloud Storage and gsutil
- Azure Blob Storage and AzCopy
- Kubernetes CronJob, StatefulSet, and VolumeSnapshot
- Terraform AWS provider
- Bash, curl, jq, and yq

## Sources Consulted
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki TSDB documentation: https://grafana.com/docs/loki/latest/operations/storage/tsdb/
- Grafana Loki WAL documentation: https://grafana.com/docs/loki/latest/operations/storage/wal/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- AWS CLI `s3 sync` command reference: https://docs.aws.amazon.com/cli/latest/reference/s3/sync.html
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Microsoft AzCopy sync documentation: https://learn.microsoft.com/en-us/azure/storage/common/storage-use-azcopy-blobs-synchronize
- Google Cloud Storage rsync documentation: https://docs.cloud.google.com/storage/docs/working-with-big-data

## Issues Found
- The object storage layout implied a fixed `index/` prefix. Updated the example to show current TSDB or BoltDB Shipper-style `index_YYYY-MM-DD` prefixes, which depend on `schema_config`.
- The S3 backup, restore, and verification examples assumed only `index/`. Updated them to include both `index/` and `index_*` prefixes.
- The rules backup script attempted to derive tenant IDs from `/loki/api/v1/labels`, but that endpoint returns label names, not tenants. Replaced it with an explicit tenant list.
- The rules restore example posted an entire exported rules dictionary to `/loki/api/v1/rules/{tenant}`. Loki expects a namespace in the URL and a single rule group body. Updated the example to iterate namespaces and rule groups from the exported YAML.
- The restore health check used `/ring`, which is not a current documented Loki ring endpoint. Replaced it with `/ready` and `/distributor/ring`.
- The WAL restore script scaled ingesters to zero and then tried to `kubectl exec` into pods that would no longer exist. Replaced it with a VolumeSnapshot-based PVC restore example.

## Review Notes
The guide remains deployment-sensitive. Bucket prefixes, StatefulSet names, PVC names, storage classes, and tenant lists must be adjusted for each Loki installation. The `rules` restore example now uses `yq` in addition to the existing shell tooling.
