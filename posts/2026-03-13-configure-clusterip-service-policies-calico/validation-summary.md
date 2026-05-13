# Validation Summary: How to Configure ClusterIP Service Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico NetworkPolicy
- Kubernetes Services and ClusterIP networking
- Kubernetes network policy enforcement concepts
- `calicoctl`
- `kubectl`
- YAML
- Mermaid

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico policy for services exposed externally as ClusterIPs: https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico service rules in policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico service IP advertisement documentation: https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico Kubernetes services training documentation: https://docs.tigera.io/calico-cloud/tutorials/training/about-kubernetes-services
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The introduction implied that Calico policies act directly on ClusterIP Services. Calico NetworkPolicy selects workload endpoints, so I changed the wording to state that the policy controls traffic to the pods backing ClusterIP Services.
- The external exposure claim was too broad. ClusterIP Services are normally internal unless advertised outside the cluster, such as with Calico BGP service IP advertisement, so I clarified the external exposure context.
- The egress rule for database access contained two `destination` keys. YAML parsers treat duplicate keys inconsistently and the selector could be lost, so I merged the selector and port into one `destination` block.
- The TCP service port rules omitted `protocol: TCP`. Calico examples use explicit protocol when matching TCP ports, so I added `protocol: TCP` to the HTTP, monitoring, and database rules.
- The verification command ran from the `test` namespace even though the policy source selectors are scoped to the `production` namespace by default. I changed the example to execute from a production frontend pod.
- The architecture diagram implied that Calico policy applies at the ClusterIP Service object. I updated the label to show DNAT to the backing pod before Calico allow/deny evaluation.
- The conclusion repeated "policies" and used the same misleading "ClusterIP Service Policies" phrasing, so I corrected it to "Calico network policies."

## Review Notes
The post is now technically consistent with Calico's endpoint-based policy model for standard in-cluster service traffic. For a future expansion, a separate example could show the GlobalNetworkPolicy and HostEndpoint approach required for ClusterIP Services advertised outside the cluster in cluster mode.
