# Validation Summary: How to Troubleshoot Performance Tuning in Cilium Hubble

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Prometheus
- kubectl

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Performance Tuning Guide, Hubble section: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Monitoring & Metrics, Hubble metrics: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Kubernetes Configuration, monitor aggregation options: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium command reference for cilium-dbg config and status: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_config_get.html and https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium agent command reference for Hubble event buffer and queue flags: https://docs.cilium.io/en/latest/cmdref/cilium-agent_hive_dot-graph/

## Issues Found
- The post used top-level Helm values `monitorAggregation` and `monitorAggregationInterval`. Updated them to documented Cilium Helm values `bpf.monitorAggregation` and `bpf.monitorInterval`.
- The monitor aggregation check used `cilium config | grep MonitorAggregation`, which does not match the documented runtime config key format. Updated it to `cilium-dbg config get monitor-aggregation`.
- The flow-rate check used `cilium_event_ts` from the Cilium metrics endpoint, which is a control-plane event timestamp metric rather than a Hubble flow counter. Updated it to use `hubble_flows_processed_total` on the Hubble metrics endpoint.
- The memory reduction example set `hubble.eventBufferCapacity` to `4096`, but Cilium requires one less than a power of two for the Hubble event buffer. Updated it to `4095`.
- The buffer sizing example used `65536` as a valid event buffer capacity. Updated it to `65535`, matching Cilium's allowed capacities.
- The Hubble metric cardinality reduction command used `--set-json` for `hubble.metrics.enabled`. Updated it to the documented Helm list syntax `--set hubble.metrics.enabled="{dns,drop,tcp,flow}"`.
- The event-loss section referenced non-documented `cilium_perf_event_*` metrics and queried the wrong metrics endpoint. Updated it to use documented Hubble metrics `hubble_lost_events_total` and `hubble_flows_processed_total` on port `9965`.
- The event-loss fix claimed `bpf.events.drop.enabled=true` increased the BPF perf event buffer size. Replaced it with `hubble.eventQueueSize=32768`, which is the documented setting for increasing the Hubble event queue for bursts.
- In-pod status commands used `cilium status --verbose`; updated them to `cilium-dbg status --verbose`, matching the Cilium in-agent command reference.
- The troubleshooting note referenced `monitorAggregation=maximum`; updated it to `bpf.monitorAggregation=maximum`.

## Review Notes
The guide is technically relevant and now aligns with the documented Cilium/Hubble metrics, Helm values, and runtime command names. Several operational thresholds in the article, such as CPU baselines, high cardinality line counts, and scrape-duration cutoffs, are environment-specific heuristics rather than Cilium guarantees.
