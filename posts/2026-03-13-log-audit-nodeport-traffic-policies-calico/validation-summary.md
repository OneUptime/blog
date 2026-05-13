# Validation Summary: How to Log and Audit NodePort Traffic Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints and pre-DNAT policy
- Kubernetes NodePort services
- `calicoctl`
- `kubectl`

## Sources Consulted
- Calico GlobalNetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT policy documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico apply-on-forward documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico Kubernetes host endpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Kubernetes Service and NodePort documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The policy title and description said the configuration logs/audits traffic, but the example only used `Allow` and `Deny` actions. I added `Log` rules before the corresponding allow and deny rules because Calico continues policy evaluation after a `Log` action.
- The NodePort port range used `30000-32767`, which is not Calico's documented port range syntax. I changed it to the quoted string `'30000:32767'`.
- The port rules did not specify a protocol. I added `protocol: TCP` to match the HTTP verification example and Calico's documented policy examples for destination port matching.
- The prerequisites did not mention host endpoints, but Calico documents `preDNAT` and `applyOnForward` as meaningful only for host endpoint policy. I added the host endpoint prerequisite.
- The introduction claimed unrestricted access to ClusterIP services in the NodePort policy context. I narrowed the claim to exposed NodePort services.
- The verification command curled a Kubernetes service DNS name and service port from inside a pod, which does not verify NodePort ingress. I changed it to resolve a node IP and the Service's `nodePort`, then curl `NodeIP:NodePort`.

## Review Notes
The policy assumes automatic host endpoints inherit the node's `kubernetes.io/hostname` label. In environments that do not sync that label or that use custom host endpoints, readers should adjust the selector to match their host endpoint labels.
