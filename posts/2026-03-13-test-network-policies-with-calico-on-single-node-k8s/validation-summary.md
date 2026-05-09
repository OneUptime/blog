# Validation Summary: How to Test Network Policies with Calico on Single-Node Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy
- Calico
- kubectl
- nginx
- BusyBox

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Calico network policy overview: https://docs.tigera.io/calico/latest/about/about-network-policy
- Calico eBPF dataplane documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf

## Issues Found
- The introduction said connectivity failures on a single-node cluster are "definitively" caused by network policies. This was too absolute because pod readiness, Services, DNS, and other cluster components can still cause failures. Changed the wording to say single-node testing reduces cross-node routing variables while still requiring basic troubleshooting checks.
- The post said Calico enforces policies using the same iptables rules regardless of topology. This was inaccurate because Calico can use different Linux dataplanes, including eBPF. Changed the wording to refer to Calico's configured Linux dataplane while preserving the correct point that Kubernetes NetworkPolicy semantics remain the same.
- The post mentioned Calico-specific global policies and required calicoctl, but the tutorial only used Kubernetes NetworkPolicy resources and did not use calicoctl. Removed the global-policy claim and changed the prerequisite to kubectl only.
- The setup commands immediately ran connectivity checks after creating pods. Added `kubectl wait --for=condition=Ready` commands for the server and client pods so the examples do not race pod startup.
- The conclusion described the tutorial as a "full set" of Calico network policies and said results can be directly applied to production multi-node clusters. Changed this to "representative set" and framed single-node testing as a starting point before production-like multi-node validation.

## Review Notes
The Kubernetes NetworkPolicy YAML examples are syntactically valid for `networking.k8s.io/v1`. The egress example correctly allows DNS over UDP port 53 while blocking the client's TCP connection to the server Service, because ingress and egress policy decisions must both allow a connection.
