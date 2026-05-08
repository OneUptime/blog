# Validation Summary: How to Use Performance Tuning in Cilium Hubble

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- Helm
- Prometheus
- eBPF observability

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Hubble performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Kubernetes configuration reference for monitor aggregation: https://docs.cilium.io/en/stable/network/kubernetes/configuration/
- Cilium Hubble metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium Hubble internals documentation: https://docs.cilium.io/en/stable/internals/hubble/
- Cilium v1.19.3 Helm chart values: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/values.yaml

## Issues Found
- The post used `hubble.eventBufferCapacity` values such as `16384` and `65536`, and described the default as `4096`. Cilium's chart documents the supported Hubble event buffer capacities as power-of-two-minus-one values such as `4095`, `16383`, and `65535`, with a default of `4095`. Updated the examples and sizing diagram accordingly.
- The post described `hubble.eventQueueSize: "0"` as auto-sizing based on the Hubble event buffer. Official tuning documentation describes the Hubble event queue as the queue between emitted datapath events and Hubble processing, with a default based on the monitor queue size. Updated the example to use `32768`, matching the documented tuning example.
- The monitor aggregation Helm values were shown as top-level `monitorAggregation`, `monitorAggregationFlags`, and `monitorAggregationInterval`. Current Cilium Helm values use `bpf.monitorAggregation`, `bpf.monitorFlags`, and `bpf.monitorInterval`. Updated the YAML and Helm command.
- The monitor aggregation level descriptions were inaccurate. Replaced them with the documented behavior for `none`, `low`, `medium`, and `maximum`.
- The Hubble UI resource configuration used `hubble.ui.resources`, but current chart values configure resources separately under `hubble.ui.backend.resources` and `hubble.ui.frontend.resources`. Updated the resource snippet.
- The verification section used `cilium_event_ts` on the Cilium metrics port to check Hubble event processing. Hubble metrics are served on the Hubble metrics port and include `hubble_flows_processed_total` and `hubble_lost_events_total`. Updated the verification commands and troubleshooting note.

## Review Notes
The official Cilium performance tuning page for v1.19.3 contains an aggregation interval Helm example that appears inconsistent with the v1.19.3 Helm values and chart template. The post now uses the Helm chart's documented `bpf.monitorInterval` value.
