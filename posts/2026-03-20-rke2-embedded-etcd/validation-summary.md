# Validation Summary: How to Configure RKE2 with Embedded etcd

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- RKE2
- Kubernetes
- Embedded etcd
- RKE2 etcd snapshots
- S3-compatible snapshot storage
- etcdctl
- Prometheus Operator PrometheusRule resources
- PromQL alerting rules

## Sources Consulted
- RKE2 Embedded datastore documentation: https://docs.rke2.io/datastore/embedded
- RKE2 High Availability documentation: https://docs.rke2.io/install/ha
- RKE2 Configuration Options documentation: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Backup and Restore documentation: https://docs.rke2.io/datastore/backup_restore
- RKE2 Metrics documentation: https://docs.rke2.io/reference/metrics
- etcd v3.6 Configuration Options: https://etcd.io/docs/v3.6/op-guide/configuration/
- etcd v3.6 Tuning documentation: https://etcd.io/docs/v3.6/tuning/
- etcd v3.6 Maintenance documentation: https://etcd.io/docs/v3.6/op-guide/maintenance/
- etcd v3.6 Monitoring documentation: https://etcd.io/docs/v3.6/op-guide/monitoring/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The S3 snapshot example used `etcd-snapshot-retention` but did not set the dedicated S3 retention option. Current RKE2 uses `etcd-s3-retention` for S3 snapshot retention, so I added `etcd-s3-retention: 10` to the S3 example and clarified that `etcd-snapshot-retention` is for local scheduled snapshots.
- The snapshot management section labeled `ls -lh /var/lib/rancher/rke2/server/db/snapshots/` as an integrity verification step. That command only lists local snapshot files and sizes, so I changed the comment to describe what the command actually does.

## Review Notes
- The RKE2 embedded etcd default datastore behavior, HA guidance for three server nodes, snapshot schedule and retention flags, S3 configuration flags, and `rke2 etcd-snapshot` subcommands match current RKE2 documentation.
- The etcd tuning flags, heartbeat and election timeout defaults, quota flag, auto-compaction options, and maintenance commands match current etcd documentation.
- The PrometheusRule resource shape is valid, but the alert rules assume etcd metrics are already being scraped with a `job="etcd"` label. In RKE2 environments, scraping etcd may require additional monitoring configuration, such as exposing etcd metrics or creating the appropriate ServiceMonitor and TLS configuration.
