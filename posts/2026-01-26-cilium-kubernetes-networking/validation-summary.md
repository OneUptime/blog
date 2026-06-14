# Validation Summary: How to Get Started with Cilium for Kubernetes Networking

## Status
validated

## Post Type
Tutorial / Getting started guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF
- Kubernetes CNI
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- Hubble
- Helm
- Prometheus Operator ServiceMonitor
- kube-proxy replacement

## Sources Consulted
- Cilium Quick Installation: https://docs.cilium.io/en/stable/gettingstarted/k8s-install-default/
- Cilium Helm installation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium Kubernetes compatibility: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes policy documentation: https://docs.cilium.io/en/stable/security/policy/kubernetes/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium policy enforcement modes: https://docs.cilium.io/en/stable/security/policy/intro/
- Cilium Hubble setup: https://docs.cilium.io/en/stable/observability/hubble/setup/
- Cilium Hubble UI documentation: https://docs.cilium.io/en/stable/observability/hubble/hubble-ui/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium kube-proxy replacement documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium troubleshooting documentation: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Kubernetes kubectl version reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_version/

## Issues Found
- The prerequisites referenced Kubernetes v1.21 or later, which is outdated for the Cilium version used in the examples. Updated the prerequisite to state that Cilium 1.19 is tested with Kubernetes 1.32 through 1.35, and added the current Linux kernel requirement.
- The `kubectl version --short` command used a removed/deprecated flag. Replaced it with `kubectl version`.
- The Linux Cilium CLI and Hubble CLI installation commands omitted checksum verification and arm64 handling. Updated them to match current official installation patterns, and changed Hubble's `stable.txt` URL from `master` to `main`.
- The Helm examples pinned Cilium 1.15.0, which is out of support as of this review. Updated the examples to Cilium 1.19.4.
- Hubble metrics examples enabled the deprecated `http` metric. Replaced it with `httpV2`.
- The Helm examples used `kubeProxyReplacement: strict`, which is not the current documented value. Replaced it with `kubeProxyReplacement: true`.
- The DNS egress policy matched kube-dns using labels that are less portable than the documented namespace and `k8s-app` selector. Updated the example to include `k8s:io.kubernetes.pod.namespace: kube-system`.
- The namespace policy used namespace label selectors as though namespace names were labels. Replaced those matches with `k8s:io.kubernetes.pod.namespace`.
- The L7 policy comment said `/health` was allowed from anyone, but the rule was still scoped to `role=web-client`. Corrected the comment.
- The Hubble metrics ServiceMonitor example selected an incorrect service label. Replaced the handwritten ServiceMonitor with the documented Helm option `hubble.metrics.serviceMonitor.enabled=true`.
- In-container Cilium diagnostics used `cilium` commands where current troubleshooting docs use `cilium-dbg`. Updated status, endpoint, service, policy, and config commands accordingly.
- The "monitoring mode" best-practice example implied that a permissive policy logs all traffic without blocking. Replaced it with a documented `enableDefaultDeny` DNS visibility example and adjusted the surrounding wording.
- The introduction overgeneralized all traditional CNI plugins as iptables-based. Softened the statement to "many traditional CNI plugins" and clarified that Cilium programs eBPF in the kernel.
- The native routing comment implied it is generally recommended for cloud providers. Reworded it to apply when the network can route Pod CIDRs.

## Review Notes
The post is now technically valid for the current Cilium stable documentation reviewed on 2026-06-14. Some examples remain intentionally generic and may still need environment-specific values, especially native routing, kube-proxy replacement API server settings, and production Hubble/Prometheus TLS settings.
