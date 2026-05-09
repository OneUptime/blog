# Validation Summary: How to Test Network Policies with Calico on IBM Kubernetes Service

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IBM Kubernetes Service
- Kubernetes NetworkPolicy
- Kubernetes namespaces, pods, and services
- kubectl
- Calico GlobalNetworkPolicy
- Calico policy tiers
- calicoctl

## Sources Consulted
- IBM Cloud Kubernetes Service network policies documentation: https://cloud.ibm.com/docs/containers?topic=containers-network_policies
- IBM Cloud Kubernetes Service VPC Kubernetes network policies documentation: https://cloud.ibm.com/docs/containers?topic=containers-vpc-kube-policies
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico default deny policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico tiered policy guide: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The test backend used the `nginx` image while exposing and testing TCP port 5432. Because the standard `nginx` container listens on port 80, the pre-policy and post-policy connectivity checks would fail independently of network policy behavior. I changed the pod, service, NetworkPolicy rules, and `wget` checks to use port 80.
- The Calico GlobalNetworkPolicy default-deny selector used `!has(projectcalico.org/system-pod)`, which is not the documented way to keep a global default deny from selecting system namespaces. I changed it to use Calico's documented `namespaceSelector` pattern that excludes common system namespaces.
- The introduction overstated IBM Kubernetes Service as uniformly using "full CNI" access and said IBM recommends Calico GlobalNetworkPolicy for cluster-wide default policies. IBM's current documentation says every cluster includes Calico networking and recommends Kubernetes NetworkPolicy for pod traffic, while Calico policies are for advanced scenarios. I adjusted those claims while preserving the tutorial's focus.

## Review Notes
The Kubernetes NetworkPolicy examples are syntactically valid and use additive ingress and egress policy behavior correctly. The guide assumes the reader waits for both pods to become ready before running connectivity checks. In production IKS environments, users should review IBM-managed Calico host endpoint policies before applying broad global policies.
