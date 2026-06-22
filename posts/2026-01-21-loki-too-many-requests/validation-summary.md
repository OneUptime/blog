# Validation Summary: How to Debug Loki 'Too Many Outstanding Requests'

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Grafana Loki
- LogQL
- Prometheus and PromQL
- Grafana dashboards
- Docker Compose
- Kubernetes HorizontalPodAutoscaler
- Python requests

## Sources Consulted
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki LogQL log queries: https://grafana.com/docs/loki/latest/query/log_queries/
- Grafana Loki metric queries: https://grafana.com/docs/loki/latest/query/metric_queries/
- Grafana Loki request validation and rate limits: https://grafana.com/docs/loki/latest/operations/request-validation-rate-limits/
- Grafana Loki autoscaling queriers: https://grafana.com/docs/loki/latest/operations/autoscaling_queriers/
- Grafana Loki HTTP API reference: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- Grafana Loki source metrics definitions: https://github.com/grafana/loki
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Kubernetes Horizontal Pod Autoscaling: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Python Requests quickstart: https://requests.readthedocs.io/en/latest/user/quickstart/

## Issues Found
- The introduction conflated the query-frontend "too many outstanding requests" error with ingestion rate limiting. Updated it to distinguish read-path queue limits from separate ingestion HTTP 429 rate-limit errors.
- Several Loki metric names were incorrect or undocumented, including `loki_query_frontend_outstanding_requests` and `loki_query_frontend_outstanding_per_tenant`. Replaced them with current metrics such as `loki_query_frontend_queries_in_progress`, `loki_query_scheduler_queue_length`, `loki_query_scheduler_inflight_requests`, and `loki_query_scheduler_discarded_requests_total`.
- The ring diagnostic used `/ring | jq`, which is not a reliable current query-path status check. Updated it to use the query scheduler ring endpoint without assuming JSON output.
- `max_outstanding_per_tenant` was incorrectly shown under `limits_config`; it belongs under `frontend`. Moved it and corrected related quick-fix guidance.
- `max_queriers_per_tenant` was shown under `frontend` YAML, but the Loki config reference places it in `limits_config`. Moved it accordingly.
- The configuration snippet included outdated defaults for `max_query_parallelism`, `query_timeout`, and `max_query_length`. Updated the example/comments to match current Loki documentation.
- `frontend.results_cache` was invalid. Removed it from the `frontend` block because result caching is configured under `query_range`.
- Per-tenant overrides included `max_outstanding_per_tenant`, which is not a per-tenant limits override. Removed those entries.
- The Docker Compose example used the obsolete top-level `version` key and an old Loki image tag. Removed `version` and updated the image tag to a current Loki 3.x release.
- The HPA example used a Loki query scheduler metric as a Pods metric. Changed it to an External metric example and noted the need for a Prometheus/custom metrics adapter.
- The LogQL example used invalid `| limit 1000` pipeline syntax. Removed the invalid stage and clarified that the query limit should be set at the API/client layer.
- The broad-range LogQL example used `{job="application"} [30d]`, which is not a valid standalone log query. Replaced it with a valid log selector and kept the smaller-window aggregation example.
- Alert and dashboard examples referenced the removed frontend outstanding metric and `tenant` label. Updated them to query scheduler queue metrics using the `user` label.

## Review Notes
The post is technically relevant and salvageable. Some examples remain illustrative and assume the operator has appropriate Prometheus scraping, custom metrics adapters, and Loki deployment topology in place.
