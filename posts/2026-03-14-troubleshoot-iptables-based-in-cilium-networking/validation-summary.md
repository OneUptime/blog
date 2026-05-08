# Validation Summary: Troubleshooting iptables-Based Masquerading in Cilium

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- iptables masquerading
- eBPF/BPF datapath diagnostics
- Hubble
- kubectl

## Sources Consulted
- Cilium masquerading documentation: https://docs.cilium.io/en/latest/network/concepts/masquerading.html
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium command cheatsheet: https://docs.cilium.io/en/stable/cheatsheet/
- Cilium CLI status command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium `cilium-dbg` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg.html
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list.html
- Cilium `cilium-dbg metrics list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_metrics_list.html
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- Hubble CLI documentation: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Hubble setup documentation: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Kubernetes debug command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/

## Issues Found
- The post used `cilium` for commands that are run inside the Cilium agent pod. Current Cilium documentation uses `cilium-dbg` for local agent and datapath diagnostics such as `bpf tunnel list`, `monitor`, `endpoint list`, and `metrics list`. Updated those commands.
- The post checked `iptables` directly from the reader's local shell while describing node-level Cilium NAT rules. Updated the command to run `iptables` inside the Cilium DaemonSet pod, which runs with access to the node networking context.
- The pod-to-service test used `http://kubernetes.default.svc:443`, which sends plain HTTP to the Kubernetes API HTTPS port. Updated it to `https://kubernetes.default.svc:443` with `curl -k` for a simple diagnostic probe.
- The BPF map troubleshooting command used the outdated/non-current form `cilium bpf ct list global`. Updated it to `cilium-dbg bpf ct list` and referenced the current Helm values `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The performance troubleshooting note referenced `cilium bpf prog list`, which is not part of the current documented `cilium-dbg bpf` command set. Replaced it with `cilium-dbg bpf metrics list`, which is documented for datapath traffic metrics.

## Review Notes
The guide is generally accurate as a high-level troubleshooting flow. Some examples are intentionally generic, such as selecting a pod with `app=target`; readers will need to adapt those selectors and run node-local Cilium commands on the node that hosts the affected workload in multi-node clusters.
