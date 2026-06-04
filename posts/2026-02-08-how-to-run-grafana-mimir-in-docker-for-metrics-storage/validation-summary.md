# Validation Summary: How to Run Grafana Mimir in Docker for Metrics Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Grafana Mimir
- Docker
- Docker Compose
- Prometheus remote write
- Prometheus service discovery
- Grafana data source provisioning
- Node Exporter
- cAdvisor
- MinIO / S3-compatible object storage

## Sources Consulted
- Grafana Mimir Get started documentation: https://grafana.com/docs/mimir/latest/get-started/
- Grafana Mimir deployment modes documentation: https://grafana.com/docs/mimir/latest/references/architecture/deployment-modes/
- Grafana Mimir configuration parameters reference: https://grafana.com/docs/mimir/latest/configure/configuration-parameters/
- Grafana Mimir HTTP API reference: https://grafana.com/docs/mimir/latest/references/http-api/
- Grafana Mimir ruler documentation: https://grafana.com/docs/mimir/latest/references/architecture/components/ruler/
- Grafana Mimir metrics storage retention documentation: https://grafana.com/docs/mimir/latest/configure/configure-metrics-storage-retention/
- Grafana Mimir visualization documentation: https://grafana.com/docs/mimir/latest/visualize/
- Prometheus configuration reference: https://prometheus.io/docs/operating/configuration/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The quick-start `docker run` command referenced `/etc/mimir/demo.yaml` without mounting or creating that file. Changed it to mount the post's `mimir.yaml` and pass `-config.file=/etc/mimir.yaml`.
- The Mimir filesystem blocks directory overlapped with the ingester TSDB directory, which Mimir rejects at startup. Changed `blocks_storage.filesystem.dir` to `/data/blocks` and `blocks_storage.tsdb.dir` to `/data/ingester`.
- The ruler API example uploaded rules, but the main Mimir configuration did not explicitly configure writable ruler storage. Added filesystem-backed `ruler_storage` and `ruler.enable_api: true`.
- The limits comment claimed `ingestion_rate` allowed samples up to one hour old. That setting controls ingestion throughput, so the comment was corrected.
- The Prometheus Docker service discovery job used the Docker socket but the Compose examples did not mount it into Prometheus. Added a read-only Docker socket mount to both Prometheus services.
- The full exporter stack defined cAdvisor but did not scrape it. Added a `cadvisor` scrape job to the Prometheus configuration.
- The Compose snippets used the obsolete top-level `version` field. Removed it from both examples.
- The ruler API upload example used `curl -d`; Grafana Mimir's documentation recommends `--data-binary` for YAML rule bodies. Updated the command.

## Review Notes
The examples use `:latest` image tags, which is common for a short development tutorial but should be pinned for reproducible production deployments. I validated the edited Mimir config with the current `grafana/mimir:latest` container, the Prometheus config with `promtool`, and both Compose snippets with `docker compose config`.
