# Validation Summary: Common Mistakes to Avoid with Calico NodePort Traffic Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints
- Kubernetes Services
- Kubernetes NodePort
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT policy documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico Kubernetes node host endpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- The Calico policy used `ports: [30000-32767]`, but Calico port ranges must use the quoted `start:end` syntax. Changed the example to `ports: ['30000:32767']`.
- The policy matched destination ports without specifying a transport protocol. Added `protocol: TCP` to both rules so the example is valid and explicit for common TCP NodePort services.
- The verification command used `kubectl exec` to curl a ClusterIP-style service endpoint from inside the cluster, which does not validate external NodePort pre-DNAT behavior. Replaced it with commands that discover a node IP and the service's allocated NodePort, then curl `NODE_IP:NODE_PORT`.
- The prerequisites did not mention host endpoints, but Calico documents `preDNAT` and `applyOnForward` as meaningful only for host endpoint policy. Added a host endpoint prerequisite.
- The introduction incorrectly implied ClusterIP services are reachable from any external source. Narrowed the statement to exposed NodePort services reachable via node IPs.

## Review Notes
The corrected example covers TCP NodePort traffic. UDP or SCTP NodePort services would need equivalent protocol-specific rules.
