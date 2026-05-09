# Validation Summary: How to Test Network Policies with Calico on Self-Managed DigitalOcean Kubernetes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- kubectl
- Calico
- calicoctl
- BusyBox wget
- DigitalOcean Droplets

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- BusyBox wget help from the current `busybox` container image (`BusyBox v1.37.0`)

## Issues Found
- The BusyBox `wget` examples used `--timeout=5`. The current BusyBox container image accepts the command, but its documented timeout option is `-T SEC`. Changed both connectivity test commands to use `-T 5` so the examples match the documented BusyBox syntax.

## Review Notes
- The Kubernetes `NetworkPolicy` manifest uses the current `networking.k8s.io/v1` API and correctly selects the `app=server` pod for ingress isolation.
- The ingress `podSelector` correctly selects source pods in the same namespace as the policy.
- The policy intentionally allows ingress from `app=allowed-client` to all ports on the selected server pod. This is acceptable for the example because the exposed nginx server listens on port 80, but a production policy would usually specify ports explicitly.
- The Calico claims are consistent with Calico documentation: Calico supports Kubernetes NetworkPolicy enforcement and also provides Calico-specific NetworkPolicy and GlobalNetworkPolicy resources.
