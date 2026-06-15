# Validation Summary: How to Configure Loki for Log Aggregation

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Grafana Loki
- Grafana Alloy
- Grafana
- LogQL
- Docker Compose
- Kubernetes DaemonSet and ConfigMap
- S3/GCS/filesystem Loki storage

## Sources Consulted
- Grafana Loki overview: https://grafana.com/docs/loki/latest/get-started/overview/
- Grafana Loki storage configuration: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki upgrade notes: https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki LogQL metric queries: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki query examples: https://grafana.com/docs/loki/latest/query/query_examples/
- Grafana Loki data source provisioning: https://grafana.com/docs/grafana/latest/datasources/loki/
- Grafana Loki Docker installation: https://grafana.com/docs/loki/latest/setup/install/docker/
- Grafana Alloy log collection tutorial: https://grafana.com/docs/alloy/latest/tutorials/send-logs-to-loki/
- Grafana Alloy `loki.source.file` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/
- Grafana Alloy `loki.source.docker` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.docker/
- Grafana Alloy `loki.source.kubernetes` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.kubernetes/
- Grafana Alloy `loki.process` reference: https://grafana.com/docs/alloy/latest/reference/components/loki/loki.process/
- Grafana Alloy Kubernetes log collection: https://grafana.com/docs/alloy/latest/collect/logs-in-kubernetes/
- Grafana Alloy release notes: https://grafana.com/docs/alloy/latest/release-notes/
- Grafana Docker installation documentation: https://grafana.com/docs/grafana/latest/setup-grafana/installation/docker/

## Issues Found
- Promtail is EOL as of March 2, 2026, so the Promtail-based Docker Compose, local collector, and Kubernetes DaemonSet examples were outdated. Replaced them with Grafana Alloy examples using `loki.write`, `loki.source.file`, `loki.process`, `discovery.docker`, `loki.source.docker`, `discovery.kubernetes`, and `loki.source.kubernetes`.
- The Loki examples used Loki 2.9-era BoltDB Shipper configuration. Loki 2.8 and newer recommend TSDB, and current Loki removes `shared_store` from shipper and compactor configuration. Updated schemas to `store: tsdb` and `schema: v13`, replaced `boltdb_shipper` with `tsdb_shipper`, and removed `shared_store`.
- The local retention example mixed compactor retention with deprecated table manager retention. Removed `table_manager` and added `compactor.delete_request_store`, which is required when retention is enabled.
- The production storage example lacked a schema block and still used deprecated BoltDB Shipper settings. Added `schema_config` with TSDB/v13 and changed S3 storage to a current `tsdb_shipper` configuration.
- The LogQL examples used `sum(rate(...)) by (...)` in two places. Updated them to the documented aggregation form `sum by (...) (rate(...))`.
- The cost claim gave an unsupported numeric comparison against Elasticsearch. Replaced it with a documented explanation that Loki keeps a small label index and stores compressed chunks.
- The architecture diagram referenced Promtail and legacy index stores. Updated it to Grafana Alloy and TSDB.
- Version references were outdated. Updated local examples to current Loki, Alloy, and Grafana image tags available as of the review date.

## Review Notes
- I did not run the Alloy or Loki binaries locally because Alloy is not installed in the environment; Docker is available, but pulling runtime images was not necessary for the requested repository validation. The snippets were checked against official Grafana documentation.
- The Kubernetes DaemonSet example still assumes the referenced namespace and service account already exist, consistent with the original snippet scope.
