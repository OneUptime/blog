# Validation Summary: Monitoring Cilium Networking Architecture

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- Kubernetes
- Hubble
- Prometheus
- Prometheus Operator
- Grafana
- Helm
- eBPF

## Sources Consulted
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/
- Prometheus Operator API documentation for PrometheusRule resources: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Helm upgrade example enabled Hubble metrics without explicitly enabling Hubble. Added `hubble.enabled=true` and `hubble.relay.enabled=true` because Cilium documentation states Hubble metrics require Hubble itself to be enabled, and relay is needed for normal cluster-wide Hubble CLI access.
- The Helm example pinned Cilium `1.16.5`, which is outdated for a 2026 post. Updated it to `1.19.3`, matching the current stable documentation consulted during review.
- The Helm example enabled the deprecated Hubble `http` metric. Updated it to `httpV2`, which current Cilium documentation recommends instead.
- The post used Hubble CLI commands but did not list the Hubble CLI as a prerequisite. Added it to the prerequisites.
- The raw metrics endpoint verification used `wget` inside the Cilium agent pod, which is less reliable than using Cilium's documented debug command because the image contents can vary. Replaced it with `cilium-dbg metrics list`.
- The post used `cilium_agent_uptime_seconds`, which is not listed in the current Cilium metrics reference. Replaced the uptime-based panels with Prometheus `up{job="cilium-agent"}` availability queries.
- The post used `cilium metrics list`, but current Cilium command documentation exposes this as `cilium-dbg metrics list` from the agent pod. Updated both examples.
- The endpoint metric examples grouped and filtered by `endpoint_state`, but the documented label for `cilium_endpoint_state` is `state`. Updated dashboard and alert queries to use `state`.
- The alert checked `state="not-ready"`, but endpoint lifecycle states include several non-ready states. Updated the alert to detect any `state!="ready"` endpoint.
- The DaemonSet availability alert did not constrain the namespace. Added `namespace="kube-system"` to avoid matching another DaemonSet with the same name.
- The dashboard referenced `cilium_datapath_conntrack_entries`, which is not listed in current Cilium metrics. Updated it to the documented `cilium_datapath_conntrack_gc_key_fallbacks_total`.
- The dashboard referenced `cilium_k8s_client_api_calls_total`, which is not listed in current Cilium metrics. Updated it to the documented `cilium_kubernetes_events_total`.
- The Hubble examples executed `hubble observe` inside the Cilium DaemonSet. While the Hubble CLI is available in agent pods, the post already lists the Hubble CLI as a prerequisite and Hubble documentation recommends `hubble observe -P` for relay access. Updated the examples to use `hubble observe -P`.

## Review Notes
The Prometheus `job` label values in example queries can vary depending on whether metrics are discovered by pod annotations, Services, or ServiceMonitors. Users may need to adjust `job="cilium-agent"` and `job="cilium-operator"` to match their Prometheus scrape configuration.
