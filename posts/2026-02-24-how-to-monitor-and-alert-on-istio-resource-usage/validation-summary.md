# Validation Summary: How to Monitor and Alert on Istio Resource Usage

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Prometheus
- Prometheus Operator
- kube-state-metrics
- Grafana
- Bash
- jq

## Sources Consulted
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio command and metrics reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio Envoy statistics documentation: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kube-state-metrics overview: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics
- kube-state-metrics pod metrics reference: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/

## Issues Found
- Updated the Istio sample Prometheus addon URL from `release-1.22` to the current documented `release-1.30` branch.
- Replaced the custom istiod pod scrape relabeling with Istio's documented endpoints-based scrape job for the `istiod;http-monitoring` service port. The original address replacement could generate invalid or duplicate scrape targets.
- Replaced stale/non-current connected-proxy metric usage with `pilot_xds`, which is documented as the number of xDS-connected endpoints.
- Replaced `pilot_xds_push_errors` alert/query examples with the documented `pilot_total_xds_internal_errors` and `pilot_total_xds_rejects` metrics.
- Added positive-limit filtering to memory utilization ratios so containers without memory limits do not produce infinite ratios and false alerts.
- Corrected the CPU throttling ratio to use throttled CFS periods divided by total CFS periods instead of throttled seconds divided by CPU usage seconds.
- Changed the istiod OOM alert from a generic restart counter to `kube_pod_container_status_last_terminated_reason{reason="OOMKilled"}`, which matches kube-state-metrics' container termination reason metric.
- Fixed the Grafana ConfigMap payload so `istio-resources.json` is a dashboard JSON model with root-level `title`, `panels`, and `schemaVersion`, rather than an HTTP API wrapper object.
- Corrected the quick health check script's memory sorting column for `kubectl top pods -A --containers` output.
- Replaced the event-based OOMKilled sidecar lookup with a pod-status query using `lastState.terminated.reason`, which is more reliable than filtering Kubernetes events by `OOMKilling`.

## Review Notes
The post depends on cAdvisor/container metrics and kube-state-metrics being present in the Prometheus environment. `kubectl` and `promtool` were not installed in this workspace, so command behavior and rule syntax were checked against official documentation; the embedded Grafana JSON was parsed locally with Node.js.
