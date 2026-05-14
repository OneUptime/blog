# Validation Summary: Common Mistakes to Avoid with Calico ClusterIP Service Policies

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico NetworkPolicy
- Kubernetes ClusterIP Services
- calicoctl
- kubectl
- YAML
- Mermaid

## Sources Consulted
- Calico Open Source ClusterIP service policy documentation: https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico Open Source service rules in policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/service-policy
- Calico Open Source NetworkPolicy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Open Source staged network policies documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Open Source calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Service ClusterIP allocation documentation: https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes kubectl exec command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The introduction implied that "ClusterIP Service Policies" are a distinct Calico resource and that ordinary ClusterIP Services are externally reachable by default. Updated the wording to describe Calico network policies applied to pods behind ClusterIP Services, and clarified that external reachability applies to NodePorts or ClusterIPs advertised outside the cluster with BGP.
- The policy example used duplicate `destination` keys in the database egress rule, which can cause YAML parsers to drop one of the mappings. Merged the destination selector and port into a single `destination` map.
- The policy example matched TCP application ports without an explicit protocol. Added `protocol: TCP` to the TCP ingress and database egress rules to match Calico's documented examples for port-specific rules.
- The DNS egress rule allowed UDP port 53 to any destination. Constrained it to kube-dns/CoreDNS in the `kube-system` namespace using Calico's documented namespace and endpoint selector pattern.
- The architecture diagram said denied traffic is "Blocked at Node," which is not generally true for a namespaced workload `NetworkPolicy`. Updated it to "Blocked by Policy."

## Review Notes
The post's main YAML block is syntactically valid after correction. Local `calicoctl` and `kubectl` binaries were not installed in the review environment, so CLI verification was performed against official command references rather than local `--help` output.
