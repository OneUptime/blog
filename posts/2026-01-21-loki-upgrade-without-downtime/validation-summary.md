# Validation Summary: How to Upgrade Loki Without Downtime

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Loki
- Kubernetes Deployments and StatefulSets
- Helm
- Prometheus/PromQL metrics
- Istio VirtualService traffic splitting
- Loki TSDB and BoltDB Shipper storage configuration
- Loki HTTP API

## Sources Consulted
- Grafana Loki upgrade guide: https://grafana.com/docs/loki/latest/setup/upgrade/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki Helm chart values reference: https://grafana.com/docs/loki/latest/setup/install/helm/reference/
- Grafana Loki deployment modes documentation: https://grafana.com/docs/loki/latest/get-started/deployment-modes/
- Kubernetes workload API requirements for Deployments and StatefulSets: https://kubernetes.io/docs/concepts/workloads/controllers/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
- The version check used `/ready`, which is a readiness endpoint. Changed it to `/loki/api/v1/status/buildinfo`, the Loki status endpoint for build/version information.
- The upgrade documentation URL pointed to `/latest/upgrading/`, which is not the current Loki upgrade page. Updated it to `/latest/setup/upgrade/`.
- The Docker config validation command referenced a host path that would not exist inside the container. Added a bind mount and changed the config path to `/config/config.yaml`.
- Examples pinned the stale Loki `2.9.4` image tag. Replaced those with `NEW_VERSION` placeholders so the guide does not recommend an outdated version.
- Helm examples used `image.tag`, but the current Loki Helm chart uses `loki.image.tag` for the shared Loki image tag. Updated both Helm commands.
- The ingester shutdown snippet described `final_sleep` as handoff-related, but current Loki guidance favors WAL-based recovery and optional `flush_on_shutdown`; handoff/chunk transfer behavior is deprecated. Added WAL/flush settings and corrected the comment.
- The TSDB migration example used removed `shared_store` settings. Removed `shared_store` from both BoltDB Shipper and TSDB Shipper examples because current Loki uses `schema_config.configs[].object_store`.
- Kubernetes `apps/v1` Deployment and StatefulSet snippets were missing required selectors, and the StatefulSet was missing `serviceName`. Added minimal valid fields.
- The Istio example used `networking.istio.io/v1alpha3`. Updated it to the current `networking.istio.io/v1` API version.
- The ingestion error metric `loki_distributor_ingester_append_failures_total` has been removed in Loki 3.x. Replaced it with `loki_distributor_ingester_append_timeouts_total`.
- The ring health metric used the old `cortex_` prefix. Updated the PromQL and dashboard JSON to use `loki_ring_members`.
- The tail query used single quotes inside a LogQL selector in the URL. Changed it to a `curl -G --data-urlencode` command with valid double-quoted LogQL.

## Review Notes
The guide is technically relevant and useful, but some operational examples remain deployment-topology dependent. In particular, ring URLs and canary metric labels can vary depending on whether Loki is deployed as single binary, simple scalable, or microservices mode and how Prometheus relabeling is configured.
