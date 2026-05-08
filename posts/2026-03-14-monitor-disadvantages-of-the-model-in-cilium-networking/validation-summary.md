# Validation Summary: Monitoring Disadvantages of the Encapsulation Model in Cilium

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
- VXLAN encapsulation

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Running Prometheus & Grafana documentation: https://docs.cilium.io/en/stable/observability/grafana/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium endpoint lifecycle documentation: https://docs.cilium.io/en/stable/security/policy/lifecycle/

## Issues Found
- The Helm command used Cilium `1.16.5`, which is no longer the current stable documentation version. Updated the example to `1.19.3`.
- The Helm command enabled Hubble metrics without explicitly enabling Hubble. Updated it to include `hubble.enabled=true`.
- The Hubble examples use local `hubble observe` commands, so Hubble Relay and the Hubble CLI are required. Added `hubble.relay.enabled=true` and added the Hubble CLI to the prerequisites.
- The Hubble metrics list included deprecated `http`. Updated it to `httpV2`, matching current Cilium metrics documentation.
- The post referenced `cilium_datapath_conntrack_entries`, which is not a current documented Cilium metric. Replaced it with `cilium_bpf_map_pressure` for datapath capacity monitoring and used `cilium_datapath_conntrack_gc_entries` where conntrack entries are discussed.
- The post used `cilium metrics list` inside the Cilium pod. Current command reference documents `cilium-dbg metrics list`; updated the commands accordingly.
- The post used the non-existent `cilium_agent_uptime_seconds` PromQL example. Replaced it with the Prometheus scrape health metric `up{job="cilium-agent"}`.
- The post grouped `cilium_endpoint_state` by `endpoint_state`, but the documented label is `state`. Updated PromQL examples and dashboard notes to use `state`.
- The endpoint alert queried `endpoint_state="not-ready"`, which does not match the documented metric label. Updated it to alert on non-ready, non-terminal endpoint lifecycle states.
- The Cilium DaemonSet alert did not restrict the namespace. Added `namespace="kube-system"` to match the Cilium deployment namespace used throughout the guide.
- The Hubble commands executed `hubble` inside the Cilium DaemonSet while the guide describes Hubble Relay-style flow monitoring. Updated them to use local `hubble observe -P` commands.

## Review Notes
- The introduction's VXLAN 50-byte MTU overhead and the native-routing comparison match Cilium routing documentation.
- L7 metrics such as `cilium_policy_l7_total` and Hubble HTTP metrics only appear when L7 visibility or L7 policy paths are in use, so dashboards may show no data on clusters that do not exercise L7 visibility.
- Prometheus `job` labels may vary depending on whether scraping is configured through pod annotations, ServiceMonitors, or custom scrape jobs.
