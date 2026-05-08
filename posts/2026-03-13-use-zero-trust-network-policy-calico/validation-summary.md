# Validation Summary: How to Use Zero Trust Network Policy in Calico for Maximum Security

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico NetworkPolicy
- Kubernetes NetworkPolicy concepts
- Kubernetes `kubectl exec`
- Zero Trust network segmentation

## Sources Consulted
- Calico documentation: Enable a default deny policy for Kubernetes pods - https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico documentation: GlobalNetworkPolicy resource reference - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico documentation: Use service rules in policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico documentation: Use log rules to test network policy - https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The introduction said nothing is permitted by default. Calico and Kubernetes pods are default-allow unless selected by policy, so this was changed to say selected workloads are isolated with an enforced default-deny policy.
- The introduction claimed comprehensive logging of every traffic decision. Calico supports explicit `Log` actions for matching traffic, so this was changed to optional `Log` rules for traffic discovery and auditing.
- The global default-deny policy used `selector: all()` across the whole cluster without limiting system namespaces. Calico documents that global default deny can affect system and host endpoints, so `namespaceSelector` was added to keep the policy scoped to non-system workloads.
- The system allow policy permitted egress to any destination on TCP/UDP port 53 and also allowed ingress to destination port 10250. The DNS rule was narrowed to the `kube-dns` service, and the kubelet port rule was removed because it was not a correct general requirement for pod zero-trust policy.
- The default-deny verification used `http://random-ip:8080`, which tests DNS/name failure more than network policy enforcement. It now tests a real service path from an unallowed source pod.
- The Mermaid diagram referenced the removed kubelet allow and generic DNS port rule. It now reflects the corrected DNS service allow and application allow path.

## Review Notes
- The Calico YAML is syntactically valid by inspection and uses documented `projectcalico.org/v3` fields: `GlobalNetworkPolicy`, `NetworkPolicy`, `order`, `namespaceSelector`, `selector`, `types`, `egress`, `ingress`, `action`, `source`, `destination`, `ports`, and `services`.
- Calico service matching for `destination.services` is documented for the Kubernetes datastore driver. Clusters using the etcd datastore driver should use selector-based DNS policy instead.
