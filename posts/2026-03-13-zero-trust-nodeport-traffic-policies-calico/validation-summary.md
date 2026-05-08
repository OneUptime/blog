# Validation Summary: Zero Trust NodePort Traffic Control with Calico Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico pre-DNAT policy
- Calico host endpoints
- Kubernetes Services and NodePort
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT policy documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico Kubernetes node host endpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico HostEndpoint resource reference: https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes Service documentation for NodePort behavior: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes ports and protocols reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/

## Issues Found
- The post described "NodePort Traffic Policies" as if they were a distinct Calico policy type. Changed the wording to "Pre-DNAT GlobalNetworkPolicy" because Calico secures NodePort traffic by applying pre-DNAT policy to host endpoints.
- The original Calico policy used `ports: [30000-32767]`. Calico port ranges use `start:end` string syntax, so this was changed to `ports: ["30000:32767"]`.
- The original rules matched destination ports without specifying a protocol. Calico port matches require the rule protocol to be set to a port-bearing protocol, so separate TCP and UDP allow/deny rules were added.
- The prerequisites did not mention host endpoints. Added a prerequisite that Calico host endpoints must exist, or automatic host endpoints must be enabled, because `preDNAT` and `applyOnForward` policy is meaningful for host endpoints.
- The verification command curled a Kubernetes service name and service port from an in-cluster pod, which tests ClusterIP/service DNS behavior rather than NodePort pre-DNAT behavior. Updated it to curl a node IP and the Service's allocated NodePort.
- The introduction said any source could reach "NodePort or ClusterIP services." Adjusted this to focus on exposed NodePort services, since ClusterIP services are only reachable by clients with a network path to the cluster service network.

## Review Notes
The example covers TCP and UDP NodePort traffic, matching the Kubernetes default NodePort port-range reference. If a cluster uses SCTP NodePort services, matching SCTP rules would need to be added as well.
