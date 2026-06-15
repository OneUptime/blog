# Validation Summary: How to Configure Storage Backend for Prometheus

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus local TSDB
- Prometheus remote write and remote read
- VictoriaMetrics
- Thanos
- Docker Compose
- Kubernetes StatefulSets and PersistentVolumeClaims
- PromQL alerting rules
- Python storage estimation

## Sources Consulted
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Thanos Sidecar documentation: https://thanos.io/tip/components/sidecar.md/
- VictoriaMetrics single-node documentation: https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/

## Issues Found
- Prometheus retention was configured with deprecated command-line flags. Updated the examples to use the current `storage.tsdb.retention.time` and `storage.tsdb.retention.size` configuration file fields while keeping non-retention storage settings as flags.
- The Docker Compose example configured `storage.tsdb.out-of-order-time-window` as a command-line flag. Updated it to the current `storage.tsdb.out_of_order_time_window` configuration file field.
- The remote read example described `read_recent` as a read timeout. Added the correct `remote_timeout` field and clarified the `read_recent` purpose.
- The Kubernetes tuning example used deprecated retention CLI configuration and described `--storage.tsdb.head-chunks-write-queue-size` as a faster-query memory-mapped chunks setting. Moved retention into `prometheus.yml` via a ConfigMap and updated the comment to match the Prometheus flag description.

## Review Notes
Prometheus still accepts the deprecated retention flags in current releases, but current documentation says the `storage.tsdb.retention` configuration fields take precedence and should be used instead. The Thanos sidecar settings for equal min/max block duration are correct for object storage upload, and the VictoriaMetrics remote write endpoint and retention flags match the current single-node documentation.
