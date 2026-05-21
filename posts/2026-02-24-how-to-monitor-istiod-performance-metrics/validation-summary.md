# Validation Summary: How to Monitor Istiod Performance Metrics

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Istiod
- Prometheus
- Prometheus Operator PrometheusRule
- Grafana
- Kubernetes kubectl

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio Grafana integration documentation: https://istio.io/latest/docs/ops/integrations/grafana/
- Istio pilot-discovery metrics reference: https://istio.io/latest/docs/reference/commands/pilot-discovery/
- Istio source for xDS metrics: https://github.com/istio/istio/blob/release-1.30/pilot/pkg/xds/monitoring.go
- Istio source for xDS reject metrics: https://github.com/istio/istio/blob/release-1.30/pkg/xds/monitoring.go
- Istio source for Kubernetes config event metrics: https://github.com/istio/istio/blob/release-1.30/pilot/pkg/config/kube/crdclient/metrics.go
- Istio source for sidecar injection metrics: https://github.com/istio/istio/blob/release-1.30/pkg/kube/inject/monitoring.go
- Istio source for CA metrics: https://github.com/istio/istio/blob/release-1.30/security/pkg/server/ca/monitoring.go
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The push-rate query included send-error series from `pilot_xds_pushes`. Updated it to exclude `*_senderr` types and clarified that current Istio may emit xDS resource types beyond CDS, EDS, LDS, and RDS.
- The post used `pilot_xds_push_errors`, which is not a current Istio metric. Changed push error queries and alerts to use send-error series from `pilot_xds_pushes{type=~".*_senderr"}`.
- The post used `pilot_xds_connected`, which is not the current Istio connected-proxy metric. Changed connected proxy queries to `sum(pilot_xds)` and the version breakdown to `sum(pilot_xds) by (version)`.
- The post used `pilot_xds_connection_terminations`, which is not a current Istio metric. Replaced the disconnection example and alert with current XDS connection-count checks based on `pilot_xds`.
- The post grouped `pilot_k8s_cfg_events` only by `type`. Istio emits both `type` and `event` labels, so the examples now group by `(type, event)`.
- The post used `citadel_server_csr_sign_error_count`, but current Istio exports `citadel_server_csr_sign_err_count`. Updated the query and alert.
- The sidecar injection error query used a `success="false"` label on `sidecar_injection_requests_total`, but Istio exports separate success and failure counters. Updated the query to `sidecar_injection_failure_total`.
- The memory alert divided raw container memory series directly, which can fail PromQL vector matching because cAdvisor metrics may have different label sets. Updated it to aggregate by `(namespace, pod)` and require a positive memory limit.
- The `IstiodDown` alert used `up{app="istiod"}`. Updated it to `up{job="istiod"}`, matching Istio's documented Prometheus scrape job.
- The Grafana add-on URL referenced the old `release-1.20` branch. Updated it to the current `release-1.30` sample add-on URL.

## Review Notes
The post is now technically accurate for current Istio metrics. Some threshold values, such as push latency and disconnection sensitivity, remain environment-dependent and should be tuned for each mesh size and workload pattern.
