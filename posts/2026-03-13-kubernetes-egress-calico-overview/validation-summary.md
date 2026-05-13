# Validation Summary: How to Understand Kubernetes Egress with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico Cloud
- Calico Enterprise
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico IPPool outgoing NAT
- Calico DNS/FQDN policy
- Calico Enterprise egress gateways

## Sources Consulted
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico network policy default deny/allow behavior: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico Cloud DNS policy documentation: https://docs.tigera.io/calico-cloud/network-policy/domain-based-policy
- Calico Enterprise DNS policy documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico Enterprise EgressGatewayPolicy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/egressgatewaypolicy
- Calico Enterprise egress gateway configuration documentation: https://docs.tigera.io/calico-enterprise/latest/networking/egress/egress-gateway-on-prem
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post described SNAT as Calico's unconditional default for destinations outside the cluster CIDR. Calico applies outgoing NAT when `natOutgoing: true` is configured on the relevant IPPool, and it applies to destinations outside Calico IP pools. Updated the wording to match Calico's IPPool NAT behavior.
- The SNAT description said the source is rewritten specifically to the node's external IP. Calico's default MASQUERADE behavior uses an address on the outgoing interface unless otherwise configured. Updated the wording to avoid over-specifying the exact node address.
- The egress policy section referred to `CalicNetworkPolicy`, which is not a Calico resource kind, and the example used Calico's `projectcalico.org/v3` `NetworkPolicy` syntax rather than Kubernetes `networking.k8s.io/v1` syntax. Corrected the wording to Calico `NetworkPolicy` and `GlobalNetworkPolicy`.
- The FQDN policy explanation referred to a DNS controller watching DNS responses. Calico DNS policy is documented in terms of trusted DNS server responses and DNS-to-IP policy rendering. Updated the explanation to match the documented behavior.
- The `EgressGatewayPolicy` example was incomplete: a gateway rule requires both `namespaceSelector` and `selector`, and the policy must be referenced from a pod or namespace annotation to take effect. Updated the YAML to include a concrete destination CIDR, gateway namespace selector, gateway selector, and added the required annotation note.
- The conclusion described default SNAT as a universal layer. Updated it to "outgoing NAT" to stay accurate for clusters where `natOutgoing` is not enabled.

## Review Notes
The Calico policy examples intentionally use Calico CRD syntax (`apiVersion: projectcalico.org/v3`) and `action: Allow`/`Deny`, which is valid for Calico policy but differs from upstream Kubernetes NetworkPolicy syntax. FQDN policy and egress gateways are Calico Cloud/Enterprise capabilities, as stated in the post.
