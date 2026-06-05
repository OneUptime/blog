# Validation Summary: How to Monitor Docker Registry Performance

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker Registry / CNCF Distribution
- Docker Compose
- Docker CLI
- Prometheus
- PromQL
- Grafana provisioning
- cAdvisor

## Sources Consulted
- CNCF Distribution registry configuration documentation: https://distribution.github.io/distribution/about/configuration/
- CNCF Distribution v2.8.3 source for metrics registration and HTTP handler labels: https://github.com/distribution/distribution/tree/v2.8.3
- Prometheus histogram and `histogram_quantile()` documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/2.52/querying/functions/#histogram_quantile
- Docker Compose Specification documentation for obsolete `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose `expose` documentation: https://docs.docker.com/reference/compose-file/services/#expose
- Docker port publishing documentation: https://docs.docker.com/get-started/docker-concepts/running-containers/publishing-ports/
- Docker `docker container stats` CLI documentation and local `docker stats --help`: https://docs.docker.com/reference/cli/docker/container/stats/
- Live `registry:2` metrics and log output from a temporary local container using the post's Prometheus configuration.

## Issues Found
- The Compose example used the obsolete top-level `version: "3.8"` field. Removed it to match the current Compose Specification.
- The Compose example only used `expose` for port 5001 while later commands used `localhost:5001`. `expose` does not publish ports to the host, so the local curl commands would fail. Published the metrics port as `127.0.0.1:5001:5001` to keep it localhost-only while making the examples work.
- The post listed `registry_storage_blob_upload_seconds_bucket` and `registry_storage_blob_upload_in_progress`, but these metrics are not emitted by `registry:2` with Prometheus enabled. Replaced them with blob upload HTTP handler metrics that are emitted by the registry.
- Several PromQL examples used uppercase HTTP method label values. The registry's Prometheus instrumentation normalizes methods to lowercase, so the queries were changed to `get`, `put`, and `patch`.
- The P95 latency query and alert did not aggregate classic histogram buckets with `sum by (le)`, which is required when aggregating across handlers or instances. Updated both expressions.
- The request-rate query said "by method" but did not aggregate by method. Updated it to `sum by (method)`.
- The storage latency query and alert averaged per full label set rather than by action type. Updated them to aggregate with `sum by (action)`.
- The `docker inspect --format='{{json .State}}' registry` command was described as detailed resource stats, but it returns container state metadata. Replaced it with `docker stats --no-stream --format json registry`.
- The registry log grep searched for `duration=...s`, but current registry logs use fields like `http.response.duration=...`. Updated the grep pattern.

## Review Notes
- The pinned Prometheus, Grafana, and cAdvisor image tags are older than current releases as of 2026-06-05, but the examples remain technically valid. For production use, teams should pin versions deliberately and update them through their normal vulnerability and compatibility process.
