# Validation Summary: How to Implement Network Policies with eBPF on Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Cilium CNI
- eBPF datapath
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Hubble observability
- Helm
- Prometheus and Grafana
- Envoy-based Layer 7 policy enforcement

## Sources Consulted
- Cilium Helm installation docs: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium kube-proxy replacement docs: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Kubernetes compatibility docs: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Cilium system requirements docs: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium network policy overview: https://docs.cilium.io/en/stable/security/policy/
- Cilium Kubernetes NetworkPolicy/CNP/CCNP docs: https://docs.cilium.io/en/stable/network/kubernetes/policy/
- Cilium Layer 7 policy docs: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium command cheatsheet and command reference: https://docs.cilium.io/en/stable/cheatsheet/ and https://docs.cilium.io/en/latest/cmdref/
- Cilium metrics docs: https://docs.cilium.io/en/stable/observability/metrics/
- Kubernetes NetworkPolicy docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- Updated Cilium installation from `1.15.0` to `1.19.5`, and aligned Kubernetes/kernel prerequisites with current Cilium compatibility and system requirements.
- Corrected Cilium in-agent commands from `cilium ...` to `cilium-dbg ...`, and replaced removed `cilium policy trace` examples with supported dry-run and `cilium-dbg preflight validate-cnp` validation commands.
- Removed the unsupported `policy.cilium.io/enforce` namespace label and clarified that policy enforcement is driven by Cilium policy enforcement mode and selected endpoints.
- Corrected Cilium DNS and cross-namespace selectors to use Cilium's Kubernetes label keys such as `"k8s:io.kubernetes.pod.namespace"` and `"k8s:k8s-app"`.
- Fixed the FQDN policy example to include DNS proxy interception via `rules.dns`, which is required for `toFQDNs` IP discovery.
- Reworked the cluster-wide policy example from an invalid/misleading CIDR "deny external except private" allow rule into a valid default-deny egress baseline plus an explicit allow policy.
- Clarified that L7 filtering is handled by Envoy redirection from the eBPF datapath, not by eBPF natively parsing all application protocols.
- Corrected the gRPC section to describe HTTP/2 path matching rather than Protocol Buffer field inspection.
- Removed the incomplete `CiliumEnvoyConfig` rate limiting example and clarified that Cilium network policy selects/allows traffic while rate limiting must be configured in Envoy.
- Updated policy-related Prometheus metric names to match Cilium's current metrics reference.

## Review Notes
YAML snippets containing Kubernetes or Cilium resources were parsed locally for syntax. Commands and CRD behavior were verified against official documentation, but no live Kubernetes/Cilium cluster was available in this workspace for runtime execution.
