# Validation Summary: How to Monitor Automatic Adjustment in Cilium configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Prometheus
- Prometheus Operator
- Grafana
- Hubble
- eBPF

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status/
- Cilium `cilium-health status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-health_status/
- Cilium Endpoint Lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Cilium Kubernetes requirements: https://docs.cilium.io/en/stable/network/kubernetes/requirements/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/

## Issues Found
- The post described broad "automatic adjustment features" as if they were a specific self-tuning Cilium feature. Updated the wording to focus on monitoring runtime configuration and state changes such as endpoint regeneration, identity allocation, and policy updates.
- The prerequisites listed Kubernetes v1.21+ and Cilium v1.14+ as current baseline guidance. Updated this to require a Kubernetes version supported by the installed Cilium release and noted that Cilium 1.19 documents Kubernetes 1.31-1.34 as e2e tested.
- The Hubble metrics Helm example enabled OpenMetrics but did not enable any Hubble metric families. Added `hubble.metrics.enabled` with a valid metric list.
- The metrics verification command used `curl` inside the Cilium agent container, which is not guaranteed to exist. Replaced it with `cilium-dbg metrics list`.
- Several metric inspection examples used `cilium metrics list`, which is not a current top-level Cilium CLI command. Replaced these with `kubectl exec ... cilium-dbg metrics list`.
- The Grafana dashboard example enabled Hubble UI instead of Cilium dashboard ConfigMaps. Replaced it with the documented dashboard Helm values: `dashboards.enabled`, `hubble.metrics.dashboards.enabled`, and `operator.dashboards.enabled`.
- The policy regeneration alert referenced a non-documented `cilium_policy_regeneration_time_stats_seconds` metric. Replaced it with the documented endpoint regeneration metric.
- The daily health script used unsupported `cilium status --brief`, `cilium identity list`, and `cilium endpoint list` commands. Replaced them with valid `cilium status` and Kubernetes CRD queries.
- The verification section used `cilium health status`, which is a `cilium-health status` command. Updated it to run `cilium-health status` from a Cilium agent pod.
- The operator pod selector used `name=cilium-operator`, which does not match the current documented/default Cilium operator selector. Updated it to `io.cilium/app=operator`.
- The endpoint count command used unsupported top-level endpoint CLI commands. Updated it to count `CiliumEndpoint` resources through `kubectl`.
- Troubleshooting guidance referenced Linux kernel 4.19 as the baseline. Updated it to the current Cilium system requirement wording, Linux 5.10 or an equivalent vendor kernel.
- Troubleshooting guidance used deprecated or unavailable daemon commands such as `cilium policy get`, `cilium bpf tunnel list`, and top-level endpoint commands. Replaced these with Kubernetes policy resource queries, `cilium config view`, and `cilium-dbg endpoint get`.

## Review Notes
- The post is now technically accurate against current Cilium stable documentation as of 2026-05-08. Some operational examples still assume the Prometheus Operator CRDs are installed before applying `PrometheusRule`, which is already implied by the Prometheus/Grafana prerequisite but should be called out explicitly in a future broader rewrite.
