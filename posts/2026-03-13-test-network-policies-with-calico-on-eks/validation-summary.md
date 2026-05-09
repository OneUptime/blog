# Validation Summary: How to Test Network Policies with Calico on EKS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EKS
- Amazon VPC CNI
- Calico
- Kubernetes NetworkPolicy
- kubectl
- Kubernetes Services and Pods

## Sources Consulted
- Calico Amazon EKS installation documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/managed-public-cloud/eks
- Calico network policy getting started documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Amazon EKS network policy documentation: https://docs.aws.amazon.com/eks/latest/userguide/cni-network-policy.html

## Issues Found
- The introduction stated that EKS with Calico supports "full Kubernetes NetworkPolicy and Calico GlobalNetworkPolicy enforcement" without distinguishing Kubernetes NetworkPolicy from Calico-specific APIs. This was clarified to say that Calico supports the Kubernetes NetworkPolicy API and that users can also use Calico NetworkPolicy and GlobalNetworkPolicy APIs.
- The dataplane explanation implied that the VPC CNI handles same-node pod-to-pod traffic while Calico Felix specifically enforces with iptables or eBPF. This was adjusted to the documented EKS model: with Amazon VPC CNI, pod IP assignment and VPC-native routing are handled by the VPC CNI, while Calico enforces policy in the node dataplane.
- The prerequisites required calicoctl even though the tutorial only applies Kubernetes NetworkPolicy resources with kubectl. This was changed to make calicoctl conditional for Calico-specific policies.
- The DNS egress example only allowed UDP 53 and implied it was part of validating the client-to-nginx test. TCP 53 was added, and the text now explains that this policy is only useful for DB pods that need DNS after default-deny egress; the app client resolves the service name and has no egress policy in this tutorial.
- The conclusion said the tutorial confirmed DNS allow behavior, but no command actually validates DB pod DNS egress. The conclusion was corrected to mention only default deny and selective ingress allow validation.

## Review Notes
The kubectl command shapes and Kubernetes NetworkPolicy API fields are current and valid. The cross-node test uses direct nodeName overrides, which is acceptable for a focused test but can fail in real clusters if the selected nodes have taints or insufficient resources.
