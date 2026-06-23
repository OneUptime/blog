# Validation Summary: How to Deploy Cilium CNI for eBPF-Powered Kubernetes Networking

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Cilium
- eBPF
- Kubernetes CNI
- Helm
- Hubble
- CiliumNetworkPolicy and CiliumClusterwideNetworkPolicy
- kube-proxy replacement
- ClusterMesh
- Prometheus metrics

## Sources Consulted
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes compatibility: https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Cilium Helm installation guide: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm chart values for v1.19.5: https://raw.githubusercontent.com/cilium/cilium/v1.19.5/install/kubernetes/cilium/values.yaml
- Cilium Kubernetes without kube-proxy guide: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Local Redirect Policy documentation: https://docs.cilium.io/en/stable/network/kubernetes/local-redirect-policy/
- Cilium DNS-based policy documentation: https://docs.cilium.io/en/stable/security/dns/
- Cilium Layer 7 policy documentation: https://docs.cilium.io/en/stable/security/policy/layer7/
- Cilium Monitoring & Metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium command cheatsheet and command reference: https://docs.cilium.io/en/stable/cheatsheet/ and https://docs.cilium.io/en/stable/cmdref/

## Issues Found
- Updated Cilium examples from version 1.15.0 to the current stable 1.19.5 because 1.15 is outdated for a 2026 deployment guide.
- Updated prerequisite guidance from Kubernetes 1.16+ and Linux 4.19+/5.4+ to Cilium 1.19 compatibility and kernel 5.10+ guidance from current official documentation.
- Corrected Helm values: `kubeProxyReplacement` is now shown as boolean `true`, `localRedirectPolicies.enabled` replaces the old `localRedirectPolicy` key, and `bgpControlPlane.enabled` replaces the outdated `bgp.enabled` example.
- Updated Hubble metrics configuration to use `dns:query` and `httpV2`, then corrected PromQL examples so they only group by labels emitted by the enabled metrics.
- Corrected the datapath diagram so HTTP L7 policy is shown as Envoy-based rather than socket eBPF enforcement.
- Replaced local `cilium bpf`, `cilium service`, and `cilium monitor` commands with `cilium-dbg` commands executed inside the Cilium DaemonSet, matching current troubleshooting documentation.
- Added deletion of the kube-proxy ConfigMap in the kube-proxy replacement workflow to match the official kubeadm cleanup guidance.
- Replaced unsupported exact performance benchmark numbers with workload-dependent, qualitative comparisons.

## Review Notes
Some production settings in the sample values file, such as native routing, DSR, Maglev, and XDP acceleration, still require environment-specific validation of kernel, routing, and cloud-provider support before use.
