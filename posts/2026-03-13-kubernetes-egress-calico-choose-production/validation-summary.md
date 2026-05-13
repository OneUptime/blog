# Validation Summary: How to Choose Kubernetes Egress with Calico for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico Cloud
- Calico Enterprise
- Kubernetes NetworkPolicy
- Calico NetworkPolicy and GlobalNetworkPolicy
- Calico DNS/domain-based policy
- Calico egress gateways
- Calico EgressGatewayPolicy

## Sources Consulted
- Calico Open Source: Network policy default allow/default deny behavior: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico Open Source: NetworkPolicy resource reference and CIDR matching with `nets`: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source: Kubernetes egress overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-kubernetes-egress
- Calico Cloud: DNS/domain-based policy: https://docs.tigera.io/calico-cloud/network-policy/domain-based-policy
- Calico Enterprise: DNS/domain-based policy: https://docs.tigera.io/calico-enterprise/latest/network-policy/domain-based-policy
- Calico Cloud: EgressGatewayPolicy resource reference: https://docs.tigera.io/calico-cloud/reference/resources/egressgatewaypolicy
- Calico Enterprise: egress gateway on-premises configuration and source IP behavior: https://docs.tigera.io/calico-enterprise/latest/networking/egress/egress-gateway-on-prem
- Calico use case: egress gateways with Calico Enterprise and Calico Cloud: https://docs.tigera.io/use-cases/egress-gateways

## Issues Found
- The post stated that egress gateways are Enterprise-only. Current Tigera documentation describes egress gateways as available with Calico Enterprise and Calico Cloud, so the relevant references were updated from "Enterprise" to "Cloud/Enterprise."
- The post stated that without egress gateways, each node's IP is the source IP. Calico documentation notes that outbound source IP can be the pod IP or node IP depending on whether the pod IP pool uses outgoing NAT, so the wording was narrowed to the common SNAT case.
- The egress gateway sizing guidance said to pre-allocate a stable IP range for gateway pods. Calico documentation explains that the final source IP for gateway traffic depends on NAT configuration, so this was clarified to cover stable gateway pod or gateway node source IPs.
- The `EgressGatewayPolicy` best practice implied that the resource alone binds namespaces to gateway pools. Calico documentation says the policy is selected by adding the `egress.projectcalico.org/egressGatewayPolicy` annotation to a pod or namespace, so that detail was added.

## Review Notes
- Calico DNS/domain-based policy is limited to egress allow rules and is not supported at the egress hook of egress gateway pods. The post does not provide implementation examples combining those features, but future revisions should call out this limitation if adding detailed gateway-plus-FQDN configurations.
