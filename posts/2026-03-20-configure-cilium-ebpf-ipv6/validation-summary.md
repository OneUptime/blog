# Validation Summary: How to Configure Cilium eBPF-Based IPv6 Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Cilium
- eBPF
- IPv6
- Kubernetes
- Helm
- Hubble
- XDP
- `bpftool`

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Kubernetes host-scope IPAM: https://docs.cilium.io/en/stable/network/concepts/ipam/kubernetes/
- Cilium kube-proxy replacement guide: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium command reference: https://docs.cilium.io/en/stable/cmdref/
- `cilium-dbg bpf endpoint list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_endpoint_list.html
- `cilium-dbg bpf ipcache list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_ipcache_list/
- `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- `cilium-dbg service list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list.html
- `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list.html
- `cilium-dbg bpf policy list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_policy_list/
- `cilium-dbg bpf metrics list`: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_metrics_list.html
- Cilium Layer 3 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer3.html
- Hubble CLI guide: https://docs.cilium.io/en/latest/observability/hubble/hubble-cli/
- Cilium monitoring and metrics reference: https://docs.cilium.io/en/stable/observability/metrics.html

## Issues Found
- The install example mixed `ipam.mode=kubernetes` with `clusterPoolIPv6PodCIDRList`, which belongs to Cilium cluster-pool IPAM rather than Kubernetes host-scope IPAM. I removed the cluster-pool setting and replaced it with settings that match the documented Kubernetes IPAM and native-routing flow.
- The install example used `ipv6NativeRoutingCIDR` and `autoDirectNodeRoutes` without explicitly setting `routingMode=native`. I added `routingMode=native` so the routing-related values match the documented native-routing configuration.
- The post was presented as an IPv6-only setup, but the install example left IPv4 enabled and the service example showed a dual-stack `clusterIPs` result. I aligned the walkthrough to IPv6-only by disabling IPv4 and updating the service example accordingly.
- Several Cilium CLI examples were stale or incorrect for current documentation, including `cilium bpf ipv6 list`, `cilium monitor --from-ip/--to-ip`, and `cilium bpf policy get <endpoint-id>`. I replaced them with documented `cilium-dbg` commands and adjusted the comments to match what those commands actually inspect.
- The policy example used `fromCIDR` to allow pod traffic inside the cluster. Cilium documents that CIDR selectors do not apply to traffic where both endpoints are managed by Cilium, so I replaced that rule with `fromEndpoints: - {}` to correctly allow Cilium-managed endpoints.
- The monitoring section described `cilium bpf endpoint list` as packet counters and used an unsupported drop-check command. I replaced those with documented Hubble flow inspection and `cilium-dbg bpf metrics list` / Prometheus metrics references.
- The XDP section implied a specific XDP program name and described XDP as a generic fastest-path feature. I narrowed the wording to Cilium's documented service acceleration behavior and changed the verification note to look for an XDP attachment rather than a fixed program name.

## Review Notes
- The `cilium-dbg` BPF and monitor commands are node-local views. In practice, readers need to run them against the Cilium pod on the node that hosts the workload they want to inspect.
- The post does not pin a Cilium chart version. The commands and Helm keys were checked against the current stable documentation available on May 6, 2026, but future chart releases may rename or deprecate specific values.
