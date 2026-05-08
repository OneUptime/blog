# Validation Summary: How to Monitor Helm template with serviceMonitor enabled fails

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Cilium
- Helm
- Kubernetes
- Prometheus Operator
- ServiceMonitor
- PrometheusRule
- Grafana dashboards
- Hubble metrics

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Argo CD troubleshooting note for `helm template` with ServiceMonitor enabled: https://docs.cilium.io/en/latest/configuration/argocd-issues.html
- Cilium CLI command reference for `cilium status`, `cilium connectivity test`, and `cilium sysdump`: https://docs.cilium.io/en/stable/cmdref/
- Prometheus Operator API reference for `PrometheusRule`: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes `kubectl exec` generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Cilium Kubernetes and system requirements documentation: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html and https://docs.cilium.io/en/stable/operations/system_requirements.html

## Issues Found
- The post stated that Helm template rendering requires ServiceMonitor CRDs to be present in the cluster. Updated this to explain that offline `helm template` depends on Helm API capabilities and should use `--api-versions monitoring.coreos.com/v1` or `prometheus.serviceMonitor.trustCRDsExist=true`.
- The monitoring Helm command enabled Cilium and Hubble metrics but did not enable ServiceMonitor resources. Added `prometheus.serviceMonitor.enabled`, `operator.prometheus.serviceMonitor.enabled`, and `hubble.metrics.serviceMonitor.enabled`.
- The Hubble command set `hubble.metrics.enableOpenMetrics=true` without selecting any Hubble metrics. Added `hubble.metrics.enabled="{dns,drop,tcp,flow,icmp}"`.
- The metric verification command used `kubectl exec -l`, which is not part of the current `kubectl exec` synopsis. Changed it to resolve a Cilium pod name first and exec into that pod.
- Several examples used `cilium metrics list`, `cilium identity list`, `cilium endpoint list`, and `cilium policy get`, but those are agent debug operations exposed through `cilium-dbg` or Kubernetes CRDs. Replaced them with `kubectl exec ... cilium-dbg ...` or `kubectl get cilium*` commands as appropriate.
- The Grafana dashboard example enabled `hubble.ui.enabled`, which deploys Hubble UI rather than Grafana dashboard ConfigMaps. Replaced it with Cilium's `dashboards.enabled`, `operator.dashboards.enabled`, and `hubble.metrics.dashboards.enabled` Helm values.
- The alert rule used deprecated `cilium_policy_regeneration_time_stats_seconds_*` metrics. Updated it to use `cilium_endpoint_regeneration_time_stats_seconds_*` and renamed the alert accordingly.
- The daily health check used unsupported `cilium status --brief`. Replaced it with `cilium status`.
- The verification section used `cilium health status`, but current Cilium health status is exposed through `cilium-health status`. Updated the example to run `cilium-health status` inside a Cilium agent pod.
- The prerequisites and troubleshooting text included fixed Kubernetes and kernel versions that are not accurate for all supported Cilium releases. Reworded them to refer to the requirements for the installed Cilium version.

## Review Notes
The PrometheusRule example is syntactically valid, but in a real Prometheus Operator deployment the Prometheus instance must select the rule by namespace and labels. The alert thresholds are examples and should be tuned per cluster baseline.
