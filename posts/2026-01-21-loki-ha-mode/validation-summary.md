# Validation Summary: How to Set Up Loki in High Availability Mode

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Grafana Loki
- Loki distributed components: ingester, distributor, querier, query frontend, query scheduler, compactor, ruler
- Loki memberlist ring configuration
- Loki TSDB storage and S3 object storage
- Kubernetes Deployments, StatefulSets, Services, probes, and anti-affinity
- Prometheus alerting and PromQL
- Loki HTTP API

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki components documentation: https://grafana.com/docs/loki/latest/get-started/components/
- Grafana Loki upgrade guide for Loki 3.0 breaking changes: https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Grafana Loki TSDB documentation: https://grafana.com/docs/loki/latest/operations/storage/tsdb/
- Grafana Loki retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki GitHub releases: https://github.com/grafana/loki/releases

## Issues Found
- The complete configuration used `ingester.max_transfer_retries`, which is no longer accepted by Loki 3.7.1. Removed the field because ingester handoff/token transfer is deprecated and WAL-backed stateful ingesters are the recommended model.
- The complete configuration used the old `query_frontend` top-level block. Changed it to the current `frontend` block name.
- The complete configuration used removed `shared_store` settings under `compactor` and `storage_config.tsdb_shipper`. Removed `tsdb_shipper.shared_store` and changed the compactor setting to `delete_request_store: s3`, matching current Loki retention/delete-request configuration.
- The Kubernetes examples pinned `grafana/loki:2.9.4`, which is outdated for a 2026 guide and incompatible with current Loki 3.x configuration guidance. Updated examples to `grafana/loki:3.7.1`, the current 3.7.x release found in the official Loki release stream.
- The examples define `POD_IP` for environment expansion but did not enable Loki config environment expansion. Added `-config.expand-env=true` to the Loki container args.
- The ring status command port-forwarded `svc/loki-distributor`, but the post does not define that Service. Changed the command to port-forward the `deployment/loki-distributor` resource shown in the post.
- The failure recovery section said tokens are transferred to healthy ingesters on failure. Reworded this to explain that distributors continue writes to healthy ingesters when quorum can be satisfied; WAL handles recovery when the failed ingester restarts.
- The verification query used `/loki/api/v1/query` with a log selector. Current Loki versions require log selectors to use range queries, so the command now uses `/loki/api/v1/query_range`.
- The conclusion promised no data loss. Reworded it to "minimizing the risk of data loss" because Loki replication and WAL reduce risk but do not guarantee zero data loss across all failure combinations.

## Review Notes
- Verified the complete Loki configuration block with `docker run --rm -t -v <tmpdir>:/config:ro grafana/loki:3.7.1 -config.file=/config/loki-config.yaml -verify-config=true`; Loki reported `config is valid`.
- The Kubernetes snippets remain illustrative and do not define every Service needed for a complete production installation.
