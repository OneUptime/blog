# Validation Summary: How to Trace Dropped Packets in Cilium Before They Reach the Pod

## Status
validated

## Post Type
Technical debugging guide

## Technologies Covered
- Cilium
- Hubble
- Kubernetes
- eBPF datapath monitoring
- Cilium network policy
- Prometheus metrics

## Sources Consulted
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium command reference for `cilium-dbg endpoint get`, `endpoint list`, and `endpoint config`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_get/
- Cilium command reference for `cilium-dbg bpf ct list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Cilium troubleshooting documentation for packet drop monitoring: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble observability setup and flow examples: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble flow API and drop reason enum documentation: https://docs.cilium.io/en/stable/_api/v1/flow/README/
- Cilium Helm reference for `bpf.ctTcpMax`, `bpf.ctAnyMax`, BPF event settings, and monitor-related options: https://docs.cilium.io/en/stable/helm-reference/
- Cilium configuration documentation for `monitor-aggregation`: https://docs.cilium.io/en/latest/network/kubernetes/configuration.html

## Issues Found
- The post used `cilium monitor`, `cilium endpoint`, `cilium bpf`, `cilium status`, and `cilium version` inside Cilium agent pods. Current Cilium command documentation exposes these as `cilium-dbg` commands, so the examples were updated to use `cilium-dbg`.
- The Hubble JSON parsing examples read the destination port from `flow.destination.port`, but Hubble flow JSON stores L4 ports under `flow.l4.TCP.destination_port` or `flow.l4.UDP.destination_port`. The Python snippets now read from those fields.
- The examples printed a `drop_reason` numeric field that is not part of the documented Hubble `Flow` fields; the documented field is `drop_reason_desc`. The output now prints the reason description.
- The drop reason code list was inaccurate and mixed older or incorrect values. It was corrected against the documented Cilium `DropReason` enum, including `POLICY_DENIED` at 133, `CT_MAP_INSERTION_FAILED` at 155, `UNKNOWN_CONNECTION_TRACKING_STATE` at 163, and `AUTH_REQUIRED` at 189.
- The CT listing example used `cilium bpf ct list global`, but the current documented syntax is `cilium-dbg bpf ct list [cluster <identifier>]`. The command now uses `cilium-dbg bpf ct list`.
- The CT overflow status check grepped `cilium status` for `CT Map`, which is not documented status output. It now checks Cilium conntrack garbage-collection metrics with `cilium-dbg metrics list`.
- Endpoint debug examples used `Debug=true` and `Debug=false`; Cilium development documentation shows endpoint debug as `debug=true` and `debug=false`. The examples were updated accordingly.
- The Hubble protocol filter example now uses the documented lowercase protocol style (`tcp`).
- The endpoint policy JSON example assumed `cilium-dbg endpoint get -o json` always returns a list. The snippet now handles either a list or object.
- The troubleshooting note used the Helm-style camelCase `monitorAggregation`; Cilium ConfigMap documentation calls the runtime option `monitor-aggregation`, so the note was corrected.

## Review Notes
The examples that run `kubectl exec ds/cilium` operate on one selected Cilium agent pod. For node-specific endpoint IDs and monitor output, readers should ensure they are executing against the Cilium pod on the node where the relevant endpoint exists.
