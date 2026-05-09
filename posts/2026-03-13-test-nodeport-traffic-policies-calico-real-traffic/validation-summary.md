# Validation Summary: How to Test NodePort Traffic Policies in Calico with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico host endpoints and pre-DNAT policy
- Kubernetes NodePort services
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico pre-DNAT policy documentation: https://docs.tigera.io/calico/latest/reference/host-endpoints/pre-dnat
- Calico Kubernetes node host endpoint documentation: https://docs.tigera.io/calico/latest/network-policy/hosts/kubernetes-nodes
- Calico calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes Service documentation for NodePort behavior: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes ports and protocols reference: https://kubernetes.io/docs/reference/networking/ports-and-protocols/

## Issues Found
- The Calico port range used `30000-32767`, but Calico policy port ranges use `start:end` string syntax. Changed both rules to `ports: ['30000:32767']`.
- The policy matched destination ports without an explicit transport protocol. Added `protocol: TCP` to both rules so the port matches are valid and align with the `curl` verification example.
- The introduction stated that exposed external traffic could reach ClusterIP services. ClusterIP services are not externally exposed by default, so the statement was narrowed to exposed NodePort services.
- The prerequisites did not mention host endpoints, but Calico `preDNAT` policy is meaningful only on host endpoints. Added a prerequisite for Calico host endpoints on Kubernetes nodes.
- The verification command curled `service-name:8080` from a pod, which tests in-cluster service access rather than NodePort traffic before DNAT. Replaced it with a real NodePort request to a node IP and nodePort.

## Review Notes
- The example now validates the TCP NodePort path. Clusters exposing UDP or SCTP NodePort services should add corresponding protocol-specific rules.
- The allowed source CIDRs are examples and should be adjusted to the actual client networks for a production cluster.
