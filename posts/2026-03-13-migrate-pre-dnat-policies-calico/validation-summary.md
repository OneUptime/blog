# Validation Summary: How to Migrate to Calico Pre-DNAT Policies for Host Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico pre-DNAT host endpoint policy
- Calico host endpoints
- Kubernetes NodePort and LoadBalancer Services
- calicoctl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Pre-DNAT policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico applyOnForward and host forwarded traffic documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The post referred broadly to LoadBalancer services as if all implementations use node IP and NodePort forwarding. Kubernetes allows LoadBalancer implementations to route directly to pods when NodePort allocation is disabled, so the wording was changed to "NodePort-backed LoadBalancer services."
- The sample policy selector uses `node == 'production-node'`, which selects HostEndpoint labels rather than the HostEndpoint `spec.node` field. The prerequisites were updated to say host endpoints must be labeled to match the policy selector.
- The sample rules matched destination ports for an HTTP curl test without declaring a protocol. The rules were updated with `protocol: TCP` to match the intended NodePort traffic explicitly.

## Review Notes
The main Calico pre-DNAT behavior is correct: `preDNAT: true` is supported on GlobalNetworkPolicy for host endpoint policy, must be used with `applyOnForward: true`, and pre-DNAT policy is ingress-only. The `calicoctl apply -f` and `calicoctl get globalnetworkpolicies -o wide` commands are valid.
