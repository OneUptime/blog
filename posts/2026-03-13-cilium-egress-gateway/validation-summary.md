# Validation Summary: Cilium Egress Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- Cilium Egress Gateway
- CiliumEgressGatewayPolicy
- Helm
- Hubble
- eBPF / BPF maps

## Sources Consulted
- Cilium Egress Gateway documentation: https://docs.cilium.io/en/stable/network/egress-gateway/egress-gateway/
- Cilium `cilium-dbg bpf egress list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_egress_list/
- Cilium `cilium-dbg bpf nat list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_nat_list/
- Cilium Egress Gateway advanced troubleshooting: https://docs.cilium.io/en/stable/network/egress-gateway/egress-gateway-troubleshooting/

## Issues Found
- The Helm command enabled `egressGateway.enabled` and `bpf.masquerade`, but current Cilium documentation also requires `kubeProxyReplacement=true`. Added that setting and the documented rollout restarts for the Cilium agent and operator.
- The gateway node labeling example labeled two nodes with the same selector while the policy used the singular `egressGateway` field. Cilium selects the first matching node in lexical order for that field, so the second label made the example misleading. Removed the second label from the single-gateway example.
- The source pod selector used `namespace: production`, which only matches a normal pod label. Cilium requires the special `io.kubernetes.pod.namespace` label to select pods by namespace. Updated the selector.
- The egress IP assignment step suggested a `cilium.io/egress-ip` node annotation for Cilium to manage the IP. Cilium documentation requires the egress IP to already be assigned to a network device on the gateway node, and says policy selection should be refreshed by re-applying the policy after network changes. Replaced the annotation command with a policy re-apply command.
- The validation step used `kubectl get ciliumbgppeeringpolicy`, which is unrelated to Egress Gateway. Removed it and kept the `ciliumegressgatewaypolicy` query.
- The BPF egress and NAT map commands used the older `cilium bpf ...` form; current command reference documents `cilium-dbg bpf egress list` and `cilium-dbg bpf nat list`. Updated both commands.

## Review Notes
- The post remains intentionally concise. Future improvements could mention Cilium Egress Gateway incompatibilities with Cluster Mesh, `kvstore` identity allocation, and CiliumEndpointSlice, but those are caveats rather than errors in the existing walkthrough.
