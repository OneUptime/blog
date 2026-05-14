# Validation Summary: Common Mistakes to Avoid with Kubernetes NetworkPolicy Basics in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico network policy enforcement
- kubectl
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl describe reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_describe/
- Calico "What is network policy?" documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Calico "Get started with Calico network policy" documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy

## Issues Found
- The introduction said the `projectcalico.org/v3` API provides the flexibility needed for the example, but the post's manifest is a standard Kubernetes `networking.k8s.io/v1` `NetworkPolicy`. Updated the wording to distinguish Kubernetes `NetworkPolicy` from Calico's additional `projectcalico.org/v3` policy APIs.
- The prerequisites listed `calicoctl`, but the post only applies and inspects a Kubernetes `NetworkPolicy` with `kubectl`. Removed `calicoctl` from the prerequisites to avoid implying it is required for this example.
- The apply/test section said `kubectl describe networkpolicy` verifies Calico enforcement. The command describes the Kubernetes resource, while Kubernetes documentation says NetworkPolicy enforcement is implemented by the network plugin. Updated the comment to say it verifies the object was created.

## Review Notes
The YAML manifest uses the current `networking.k8s.io/v1` `NetworkPolicy` API and valid `podSelector`, `policyTypes`, `ingress`, `egress`, and port fields. The DNS egress rule allows UDP port 53 to any destination because it has no `to` peer selector; this is syntactically valid, but a tighter production policy would usually restrict DNS egress to CoreDNS or the cluster DNS service endpoint.
