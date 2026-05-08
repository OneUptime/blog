# Validation Summary: How to Monitor Valid duration values in Cilium configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator PrometheusRule resources
- Grafana
- Hubble
- eBPF

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium CLI command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium` CLI reference: https://docs.cilium.io/en/latest/cmdref/cilium/
- Cilium `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium sysdump` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_sysdump/
- Cilium `cilium connectivity test` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status.html
- Cilium Kubernetes requirements documentation: https://docs.cilium.io/en/stable/network/kubernetes/requirements.html
- Cilium system requirements documentation: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/stable/network/kubernetes/ciliumendpoint.html
- Cilium upgrade guide for `--reuse-values` caveat: https://docs.cilium.io/en/stable/operations/upgrade/

## Issues Found
- The prerequisites used fixed Kubernetes and Cilium minimum versions that are not correct for current Cilium releases. Updated the Kubernetes prerequisite to require a version supported by the installed Cilium release.
- The Hubble metrics Helm example enabled OpenMetrics but did not set `hubble.metrics.enabled`, so Hubble metrics would remain disabled. Added an explicit metrics list.
- The metric inspection examples used `cilium metrics list`, which is not part of the Kubernetes-facing `cilium` CLI. Replaced those commands with `kubectl exec ... cilium-dbg metrics list -p ...`.
- Several metric name filters used non-existent names such as `identity_count`, `endpoint_count`, and `policy_regeneration`. Replaced them with current Cilium metric patterns documented in the metrics reference.
- The Grafana dashboard example enabled `hubble.ui.enabled`, which deploys Hubble UI rather than Grafana dashboard ConfigMaps. Replaced it with `dashboards.enabled`, `operator.dashboards.enabled`, and `hubble.metrics.dashboards.enabled`.
- The Prometheus alert for policy regeneration used a non-existent `cilium_policy_regeneration_time_stats_seconds` metric. Replaced it with the documented endpoint regeneration metric, `cilium_endpoint_regeneration_time_stats_seconds`.
- The daily health check used unsupported `cilium status --brief` and unsupported `cilium identity` / `cilium endpoint` commands. Replaced them with `cilium status` and Kubernetes CRD queries for identities and endpoints.
- The verification section used unsupported `cilium health status` and `cilium endpoint list` commands. Replaced them with agent-local `cilium-health status --verbose` and `kubectl get ciliumendpoints`.
- Troubleshooting guidance referenced a fixed kernel minimum and unsupported `cilium policy get`, `cilium bpf tunnel list`, and `cilium endpoint` commands. Updated the guidance to use version-specific kernel requirements, Kubernetes policy CRD inspection, `cilium-health`, and `CiliumEndpoint` resources.

## Review Notes
The post title and conclusion focus on duration values, but the body is primarily a Cilium monitoring guide and does not demonstrate changing specific duration-related Helm values. The remaining content is technically valid after correction, but a future editorial pass should align the scope more closely with the title.
