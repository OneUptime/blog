# Validation Summary: How to Fix Performance Issues in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium Helm chart configuration
- Cilium eBPF maps
- Cilium native routing and tunneling
- CiliumNetworkPolicy
- Hubble metrics
- Kubernetes
- Helm

## Sources Consulted
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Cilium routing documentation: https://docs.cilium.io/en/v1.15/network/concepts/routing/
- Cilium kube-proxy-free and BPF map sizing documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Hubble and agent metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg status` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_status.html
- Cilium CLI `status` and `config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium network policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/policy/

## Issues Found
- The monitor aggregation Helm values were shown as top-level keys. Updated them to the current `bpf.monitorAggregation`, `bpf.monitorInterval`, and `bpf.monitorFlags` values from the Cilium Helm reference.
- The monitor aggregation section made an unsupported universal claim and gave a fixed CPU reduction range. Softened it to describe the expected direction of improvement for high monitor event volume.
- The BPF map sizing example repeated default values while describing an increase. Updated the example and Helm command to use larger values while keeping the NAT size within Cilium's documented CT/NAT sizing constraint.
- The BPF inspection commands used `cilium bpf ct list global` and `cilium status` inside the agent pod. Updated them to `cilium-dbg bpf ct list` and `cilium-dbg status`, which match the current in-pod command reference.
- The native routing example used the old `tunnel: disabled` / `--set tunnel=disabled` pattern. Removed it and kept the current `routingMode=native` Helm value.
- The datapath mode check grepped for a status label that is not stable in current CLI output. Replaced it with `cilium config view | grep -E "routing-mode|tunnel-protocol"`.
- The Hubble metric cardinality Helm command used `--set-json`; changed it to the documented Helm list syntax with escaped commas in metric options.
- The endpoint regeneration metric grep used the old `cilium_endpoint_regeneration_time_stats` name. Updated it to `cilium_endpoint_regeneration_time_stats_seconds`.
- The troubleshooting section gave a fixed memory increase estimate for BPF map doubling. Replaced it with a version-safe statement that memory impact depends on map selection, IP families, preallocation, and node size.
- The troubleshooting section referenced `cilium policy trace`, which is not present in the current Cilium CLI command reference. Replaced it with `cilium connectivity test` and Hubble flow verification.

## Review Notes
Some performance impact numbers still depend heavily on workload, kernel, Cilium version, and deployment mode. The guide now avoids precise universal estimates where official documentation does not provide them.
