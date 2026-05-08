# Validation Summary: How to Create the Calico GlobalNetworkPolicy Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico GlobalNetworkPolicy
- Calico network policy selectors
- Kubernetes NetworkPolicy concepts
- Kubernetes services and pod labels
- calicoctl
- kubectl

## Sources Consulted
- Calico GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico automatic labels documentation: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico default deny policy guidance: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-default-deny
- Calico network policy getting started guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy
- Calico calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The default deny GlobalNetworkPolicy selected `all()` without excluding system namespaces. Calico's guidance warns that a global default deny can affect system and control-plane workloads, so the example was changed to select non-system Kubernetes namespaces using the Calico automatic namespace label `projectcalico.org/name`.
- The default deny explanation said it blocks all pod-to-pod traffic. This was narrowed to ingress and egress traffic for non-system pods after higher-precedence policies are evaluated, matching the updated policy scope and Calico policy ordering behavior.
- The Kubernetes API allow policy hard-coded `10.96.0.1/32`, which is a cluster-specific service IP and may not be correct in other clusters. It was changed to match the default `kubernetes` service using Calico's Kubernetes service match support.
- The namespace isolation example used `{{.Namespace}}`, which Calico does not template or evaluate in GlobalNetworkPolicy selectors. It was replaced with a concrete per-namespace example using the Calico automatic workload namespace label `projectcalico.org/namespace`.
- The egress blocking section implied that RFC1918 ranges always cover internal cluster traffic. A note was added to replace the CIDRs with the actual pod, service, and internal network CIDRs for the cluster.
- The introduction said the guide covered host endpoint protection, but no host endpoint example was included. The wording was changed to namespace protection.
- The kube-system policy used the Kubernetes namespace label. It was changed to Calico's documented automatic namespace label `projectcalico.org/name` for consistency with Calico selector examples.

## Review Notes
The DNS allow policy permits TCP and UDP port 53 to any destination, which is valid Calico syntax and works as a broad DNS allowance. In a production cluster, a tighter policy can match the kube-dns/CoreDNS service or DNS pods instead.
