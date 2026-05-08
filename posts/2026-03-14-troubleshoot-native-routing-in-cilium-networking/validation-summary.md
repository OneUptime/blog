# Validation Summary: Troubleshooting Native Routing in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- Linux networking
- eBPF/BPF datapath debugging
- Hubble

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ct_list/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli.html

## Issues Found
- The datapath examples used `cilium bpf tunnel list`, which is an encapsulation-mode check and not appropriate for native routing. Replaced it with `cilium-dbg bpf ipcache list`, which is relevant to Cilium datapath state in native routing.
- Several commands executed inside Cilium agent pods used the external `cilium` CLI name. Current Cilium command references document `cilium-dbg` for local agent debugging commands such as `monitor`, `endpoint list`, `metrics list`, and `bpf ct list`, so those examples were updated.
- The pod-to-service test used plain HTTP against `kubernetes.default.svc:443`, which targets the HTTPS Kubernetes API port with the wrong scheme. Changed it to use HTTPS with `curl -k`.
- The Hubble examples executed `hubble observe` through an arbitrary Cilium DaemonSet pod, which only gives node-local visibility unless carefully targeted. Updated the examples to use the Hubble CLI against an accessible Hubble API, matching official Hubble CLI documentation.
- The troubleshooting entry `cilium bpf ct list global` used outdated syntax. Updated it to `cilium-dbg bpf ct list`.
- The troubleshooting entry `cilium bpf prog list` is not a current Cilium debug command. Replaced it with `bpftool prog show` for kernel-loaded BPF programs and `cilium-dbg bpf metrics list` for Cilium datapath metrics.

## Review Notes
The guide is version-neutral, so the validation used current stable Cilium documentation available on 2026-05-08. Some examples still depend on cluster-specific labels, namespaces, and whether Hubble Relay or the Hubble API is reachable.
