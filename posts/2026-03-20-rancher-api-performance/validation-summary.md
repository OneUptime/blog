# Validation Summary: How to Optimize Rancher API Performance - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager API (`/v3`, `/v1`, and `/k8s/clusters/...` endpoints)
- Kubernetes API and `kubectl`
- Prometheus and Prometheus Operator (`PrometheusRule`)
- Python `requests`
- `curl`, `jq`, and basic shell tooling

## Sources Consulted
- Rancher: Previous v3 Rancher API Guide - https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher: API Reference - https://ranchermanager.docs.rancher.com/api/api-reference
- Rancher: UI Server-Side Pagination - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/ui-server-side-pagination
- Rancher: Enabling Experimental Features - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/enable-experimental-features
- Rancher: Enabling the API Audit Log to Record System Events - https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-api-audit-log
- Rancher: Enable Monitoring - https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Steve README - https://github.com/rancher/steve
- Rancher apiserver metrics source - https://github.com/rancher/apiserver/blob/main/pkg/metrics/metrics.go
- Requests advanced usage - https://requests.readthedocs.io/en/stable/user/advanced/
- Kubernetes `kubectl logs` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes API concepts - https://kubernetes.io/docs/reference/using-api/api-concepts/
- Prometheus histogram guidance - https://prometheus.io/docs/practices/histograms/
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The audit-log example was incorrect. It read the main Rancher container logs and looked for a non-existent `latency` field. I changed it to read the documented `rancher-audit-log` sidecar and compute latency from Rancher’s `requestTimestamp` and `responseTimestamp` fields.
- The cache-tuning section used undocumented environment variables `CATTLE_STEVE_CACHE_SIZE` and `CATTLE_NORMAN_CACHE_SIZE`. I replaced them with Rancher’s documented `ui-sql-cache` feature flag via `CATTLE_FEATURES`, plus the optional `CATTLE_ENCRYPT_CACHE_ALL` setting.
- The pagination example manually extracted a `marker` value even though Rancher documents a `pagination.next` link. I updated the loop to follow `pagination.next` directly.
- The filtering section incorrectly claimed that piping a full response through `jq` was a sparse fieldset optimization. That does not reduce server-side payload size. I removed that example and replaced it with documented server-side filtering examples.
- The watch example used `/v3/clusters?watch=true`, which is not the documented watch pattern used by Rancher for this case. I replaced it with a Rancher Kubernetes proxy watch example on a Kubernetes endpoint that supports `watch=true`.
- The Python snippets were not fully copy-paste safe. One snippet used an undefined `token`, another imported `lru_cache` without using it, and neither checked HTTP status before consuming JSON. I added a token placeholder, removed the unused import, and added `timeout` plus `raise_for_status()`.
- The Prometheus example used the wrong metric names (`rancher_api_request_*`) and an invalid histogram expression for Rancher. I replaced it with `steve_api_request_time_*` and `steve_api_total_requests`, which match Rancher’s own performance dashboard and metric source code.

## Review Notes
- Rancher labels `/v3` as the previous Rancher API. The post still uses `/v3` where Rancher continues to document it, but newer Rancher Kubernetes and Steve endpoints are the forward-looking API surface.
- The revised audit-log command assumes Rancher API auditing has already been enabled; Rancher disables audit logging by default.
- `ui-sql-cache` is enabled by default in Rancher v2.12 and later, so the revised caching step is framed as verifying or explicitly setting the feature rather than tuning unsupported cache-size knobs.
