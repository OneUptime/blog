# Validation Summary: Cilium Networking Configuration Options

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF
- Cilium kube-proxy replacement
- Cilium transparent encryption with WireGuard and IPsec
- Hubble observability

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium routing concepts: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Kubernetes without kube-proxy guide: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption/
- Cilium configuration documentation: https://docs.cilium.io/en/stable/configuration/
- Cilium command reference: https://docs.cilium.io/en/latest/cmdref/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/

## Issues Found
- The tunnel mode Helm examples used the older `tunnel` value. Updated them to the current `routingMode=tunnel` plus `tunnelProtocol=vxlan` or `tunnelProtocol=geneve` values.
- The native routing example used `tunnel=disabled`. Updated it to `routingMode=native`, keeping `autoDirectNodeRoutes=true` and `ipv4NativeRoutingCIDR` as valid supporting values.
- Several commands executed `cilium` inside the Cilium DaemonSet pod for agent debug operations. Updated those examples to use `cilium-dbg`, which is the current in-agent debug CLI in the official command reference.
- The connection tracking command used `cilium bpf ct list global`. Updated it to `cilium-dbg bpf ct list`, matching the current command syntax.
- The WireGuard troubleshooting example used `cilium encrypt status`. Updated it to `cilium encryption status`, which is the current Cilium CLI command for cluster-wide encryption status.
- The validation command for loaded eBPF programs used `cilium bpf perf list`, which is not a current documented command. Changed the example to `cilium-dbg bpf metrics list` and adjusted the surrounding text to check datapath metrics.
- The DSR troubleshooting note stated that DSR requires L2 adjacency. Reworded it to avoid overstating the requirement, because Cilium supports multiple DSR dispatch modes with different infrastructure requirements.
- The metrics example port-forwarded `svc/cilium-operator` on port 9963 while filtering for a forwarding-style metric. Updated it to port-forward `svc/hubble-metrics` on port 9965 and filter for `hubble_flows_processed_total` when Hubble metrics are enabled.
- The Mermaid diagram used older `Tunnel=...` labels. Updated them to reflect current `routingMode` terminology.

## Review Notes
The examples remain version-sensitive because Cilium Helm values and debug command names can change between releases. I could not run `helm show values` locally because `helm` is not installed in the workspace, so Helm value verification was performed against the official Cilium documentation.
