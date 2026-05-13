# Validation Summary: How to Debug Pre-DNAT Policies for Calico Host Traffic

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico HostEndpoint policy
- Kubernetes NodePort and LoadBalancer service ingress
- pre-DNAT policy evaluation
- calicoctl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT host endpoint policy reference: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico apply policy to forwarded traffic documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico policy for Kubernetes node ports documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/beginners/services/kubernetes-node-ports
- Calico calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get

## Issues Found
- The GlobalNetworkPolicy example matched destination ports without specifying a protocol. Calico's own port-based policy examples specify `protocol: TCP`, and the post tests HTTP NodePort traffic with `curl`, so `protocol: TCP` was added to both the Allow and Deny rules.
- The prerequisite only said host endpoints must be configured. Since `spec.selector` selects endpoint labels, not a node name field directly, the prerequisite was clarified to require HostEndpoints with labels matching the policy selector.
- The verification command used `globalnetworkpolicies`. The Calico command reference documents the resource as `globalnetworkpolicy`, so the command was updated to `calicoctl get globalnetworkpolicy -o wide | grep pre-dnat`.

## Review Notes
The core explanation is correct: Calico `preDNAT: true` policies are evaluated before DNAT, are meaningful for host endpoint policy, must use `applyOnForward: true`, and must be ingress-only. In future, the post could be improved by adding a sample HostEndpoint manifest and a safer staged/test policy flow, but those are completeness improvements rather than correctness fixes.
