# Validation Summary: CiliumClusterwideNetworkPolicy

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- CiliumClusterwideNetworkPolicy
- CiliumNetworkPolicy
- Cilium host firewall
- eBPF networking and policy enforcement

## Sources Consulted
- Cilium Kubernetes Network Policy documentation: https://docs.cilium.io/en/latest/network/kubernetes/policy/
- Cilium Host Policies documentation: https://docs.cilium.io/en/latest/security/policy/host/
- Cilium Layer 3 Policies documentation: https://docs.cilium.io/en/latest/security/policy/layer3/
- Cilium Layer 4 Policies documentation: https://docs.cilium.io/en/latest/security/policy/layer4/
- Cilium Kubernetes policy constructs documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/

## Issues Found
- The post implied that `nodeSelector` host policies work without mentioning the host firewall requirement. I added `hostFirewall.enabled=true` to the prerequisites and clarified that host policies apply when Cilium host firewall is enabled.
- The introduction and conclusion described node targeting too broadly. I clarified that Cilium host policies apply to the host namespace on selected nodes, including host-networking pods, and not to all ordinary pod traffic.
- The default-deny example allowed ingress from the `kube-apiserver` entity with a comment saying it allowed kubelet probes. Kubelet probes originate from the local node host, so I changed the ingress entity to `host`.
- The verification command used `cilium endpoint list`. Current Cilium documentation uses `cilium-dbg endpoint list` inside the Cilium agent pod, so I updated the command.

## Review Notes
The YAML examples use the current `cilium.io/v2` API and valid CCNP/CNP policy fields. The monitoring example's `endPort` value is valid because Cilium's `PortProtocol` supports numeric `endPort` values for port ranges.
