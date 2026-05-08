# Validation Summary: Diagnosing Native Routing Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF / BPF host routing
- Native routing
- BGP
- Hubble
- iperf3
- bpftool and bpftrace

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Performance Tuning Guide, eBPF Host-Routing: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Troubleshooting Guide: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Command Cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources and transport documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble exporter JSON examples: https://docs.cilium.io/en/stable/observability/hubble/configuration/export.html

## Issues Found
- The post used the external `cilium` CLI for agent-local commands such as `status`, `bpf`, `endpoint`, and `monitor`. Current Cilium documentation uses `cilium-dbg` inside a Cilium pod for these operations, so the examples were updated to run through `kubectl exec -n kube-system ds/cilium -- cilium-dbg ...`.
- The native routing verification expected `tunnel=disabled` from `cilium config view`. Modern Cilium configuration is represented by `routing-mode: native` in the `cilium-config` ConfigMap and by the Helm value `routingMode=native`, so the verification command was changed to read the ConfigMap directly.
- The BPF host routing troubleshooting note said it requires only `kubeProxyReplacement=true` and kernel 5.10+. Official Cilium performance documentation lists eBPF kube-proxy replacement and eBPF masquerading as requirements, with host routing enabled automatically when supported, so the note was corrected.
- The Hubble JSON `jq` examples referenced fields such as `.verdict` and `.source` at the top level. Hubble JSON output wraps flow data under `.flow`, so those filters were corrected to use `.flow.verdict`, `.flow.source`, `.flow.destination`, and `.flow.drop_reason_desc`.

## Review Notes
The guide is technically relevant and broadly accurate after the command corrections. Some benchmark claims, especially the conclusion's "90%+ of bare-metal throughput", remain environment-dependent and should be treated as a performance expectation rather than a guaranteed outcome.
