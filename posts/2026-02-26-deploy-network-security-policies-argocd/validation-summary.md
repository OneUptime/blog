# Validation Summary: How to Deploy Network Security Policies with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Argo CD Application manifests and automated sync
- Kyverno ClusterPolicy generate rules
- CiliumNetworkPolicy and Cilium policy troubleshooting
- kubectl

## Sources Consulted
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/auto_sync/
- Kyverno generate rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/generate/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/latest/security/policy/kubernetes/
- Cilium Layer 7 DNS and FQDN policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium policy troubleshooting documentation: https://docs.cilium.io/en/stable/security/policy/troubleshooting/
- Cilium CLI command reference: https://docs.cilium.io/en/stable/cmdref/

## Issues Found
- The Cilium L7 HTTP example used `io.kubernetes.pod.namespace` in `fromEndpoints`. Updated it to `k8s:io.kubernetes.pod.namespace`, matching the namespace selector form documented by Cilium for cross-namespace endpoint selectors.
- The Cilium FQDN egress example allowed `toFQDNs` traffic without an L7 DNS rule. Cilium documents that `toFQDNs` rules need DNS proxy visibility from an L7 DNS rule, so the example now includes DNS egress to kube-dns with `rules.dns`.
- The testing section used `cilium policy trace`, which is not present in the current Cilium command reference. Replaced it with a current `cilium-dbg policy get` inspection command run through the Cilium DaemonSet.

## Review Notes
The Kubernetes NetworkPolicy examples are structurally valid and align with Kubernetes selector semantics. The DNS and monitoring examples assume common labels and ports (`k8s-app: kube-dns`, Prometheus labels, and workload metrics ports), so readers may still need to adapt them to their own cluster conventions.
