# Validation Summary: Zero Trust Security with Calico Default Deny Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico Open Source network policy
- Calico GlobalNetworkPolicy
- Calico NetworkPolicy
- Calico policy tiers
- YAML configuration

## Sources Consulted
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico documentation: Get started with policy tiers - https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico documentation: Tier resource reference - https://docs.tigera.io/calico/latest/reference/resources/tier
- Calico documentation: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: NetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The original security-tier default deny policy used terminal `Deny` rules before the application tier. Calico tier processing stops when a policy returns `Allow` or `Deny`, so the later application-tier allow policy would never be evaluated for non-DNS/non-kubelet traffic. I changed the tiers so the security tier uses `defaultAction: Pass` and the application tier provides the default deny behavior.
- The global default deny originally selected all endpoints, including system namespaces and potentially host endpoints. Calico's default-deny guidance warns that global default deny policies can affect Kubernetes and Calico control-plane components. I scoped the default deny to non-system namespaces.
- The kubelet allow example permitted ingress to destination port `10250` on all selected endpoints. Port 10250 is the kubelet API port on nodes, not a general workload port for kubelet-originated pod probes. I changed the example to a node-originated health-check allow rule with a placeholder workload health-check port.
- The post stated that Calico policies make every connection authenticated and every decision logged. Calico network policy authorizes traffic based on selectors and rules; logging requires explicit log rules or flow-log collection. I updated those claims accordingly.
- The architecture diagram described the security tier as the default-deny decision point even though traffic needed to continue to the application tier. I updated the diagram label and health-check terminology to match the corrected policy flow.

## Review Notes
- The DNS allow example is syntactically valid, but it allows any destination on TCP/UDP port 53. In production, consider narrowing DNS egress to the kube-dns/CoreDNS service or pod selectors where supported by the chosen Calico datastore and deployment model.
- The example assumes Kubernetes namespace labels such as `kubernetes.io/metadata.name` are present, which is standard on modern Kubernetes clusters.
