# Validation Summary: How to Debug NodePort Traffic Policies in Calico When Traffic Is Blocked

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints
- Kubernetes Services
- Kubernetes NodePort
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico policy for Kubernetes nodes: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico host forwarded traffic and pre-DNAT policy: https://docs.tigera.io/calico/latest/network-policy/hosts/host-forwarded-traffic
- Calico protect hosts tutorial, including NodePort pre-DNAT policy: https://docs.tigera.io/calico/latest/network-policy/hosts/protect-hosts-tutorial
- Kubernetes Service documentation, including NodePort behavior and default port range: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The Calico port range syntax used `30000-32767`, but Calico documents port ranges as quoted `start:end` strings. Changed the policy to use `'30000:32767'`.
- The policy matched destination ports without specifying a protocol. Calico examples specify `protocol: TCP` when matching TCP destination ports, and NodePort Services are protocol-specific. Added `protocol: TCP` to the allow and deny rules.
- The prerequisites did not mention host endpoints, but Calico `preDNAT` and `applyOnForward` policies are meaningful only when applied to host endpoints. Added a prerequisite that Calico host endpoints are enabled for selected nodes.
- The verification command tested an in-cluster service DNS name and service port, which does not validate external NodePort pre-DNAT policy behavior. Changed it to test `<node-ip>:<node-port>`.
- The introduction said unrestricted sources could reach NodePort or ClusterIP services. ClusterIP Services are not exposed externally in the same way as NodePort Services, so the sentence was narrowed to reachable NodePort Services.

## Review Notes
The example now validates for TCP NodePort traffic. Clusters exposing UDP or SCTP NodePort Services would need equivalent rules for those protocols. The allowlist CIDRs are examples and should be adjusted for the cluster's trusted source networks.
