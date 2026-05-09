# Validation Summary: How to Test Network Policies with Calico on Minikube

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico
- Calico GlobalNetworkPolicy
- Minikube
- kubectl
- calicoctl
- BusyBox
- nginx

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl expose reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_expose/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Minikube start command reference: https://minikube.sigs.k8s.io/docs/commands/start/
- Calico quickstart for Minikube: https://docs.tigera.io/calico/latest/getting-started/kubernetes/minikube
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico eBPF use cases: https://docs.tigera.io/calico/latest/operations/ebpf/use-cases-ebpf

## Issues Found
- The post used `calicoctl` in Step 7 but did not list it as a prerequisite. Added `calicoctl installed and configured for the Minikube cluster` to the prerequisites.
- The GlobalNetworkPolicy example selected pods with `role == 'restricted'`, but the tutorial never created a pod with that label or tested the policy result. Added a `restricted-client` pod, a pre-policy connectivity check, and a post-policy timeout check to validate that the egress-deny GlobalNetworkPolicy is actually enforced.

## Review Notes
The Kubernetes NetworkPolicy examples use the current `networking.k8s.io/v1` API and match the documented additive allow-list behavior for ingress isolation. The namespace selector using `kubernetes.io/metadata.name: frontend` is valid for targeting a namespace by name. Calico's documentation confirms Minikube supports Calico via `--cni=calico`, Calico supports Kubernetes NetworkPolicy and GlobalNetworkPolicy, and the standard Linux dataplane is iptables-based with eBPF available as an alternative.
