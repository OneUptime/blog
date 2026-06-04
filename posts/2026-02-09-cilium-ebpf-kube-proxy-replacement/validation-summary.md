# Validation Summary: How to Configure Cilium eBPF-Based kube-proxy Replacement

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes
- kubeadm
- kube-proxy
- Cilium
- eBPF
- Helm
- NodePort, LoadBalancer, and Kubernetes Services
- Prometheus metrics

## Sources Consulted
- Cilium Kubernetes Without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium Kubernetes Requirements and Compatibility: https://docs.cilium.io/en/stable/network/kubernetes/requirements/ and https://docs.cilium.io/en/stable/network/kubernetes/compatibility/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium command reference for `cilium status`, `cilium connectivity test`, `cilium-dbg service list`, and `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/
- Kubernetes kubeadm init documentation: https://kubernetes.io/docs/reference/setup-tools/kubeadm/kubeadm-init/
- Kubernetes kubeadm v1beta4 configuration reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta4/
- Kubernetes Service documentation for NodePort allocation: https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- Updated the Cilium version from 1.15.0 to 1.19.4 because the current stable Cilium documentation and chart reference use 1.19.4, and the original version was outdated.
- Corrected Cilium and Kubernetes prerequisites. The post claimed Kubernetes 1.24+ and kernel 4.9.17+, but current Cilium stable requirements list tested Kubernetes versions for the release and require Linux kernel 5.10+ or equivalent distribution kernels.
- Replaced deprecated kubeadm `v1beta3` config examples with `v1beta4`.
- Removed Helm values that were redundant or misleading when `kubeProxyReplacement=true` is set, and enabled Prometheus metrics because the monitoring section relies on them.
- Removed the invalid `kubectl exec ds/cilium -- cilium cleanup` command and kept the documented kube-proxy iptables cleanup command.
- Replaced in-pod `cilium` inspection commands with documented `cilium-dbg` commands.
- Tightened over-broad performance claims, including O(n)/O(1) wording, "cuts latency in half", and fixed 20-40% latency improvement claims.
- Corrected DSR guidance to include native routing and an explicit DSR dispatch mode, and added the Maglev hash seed recommended by Cilium.
- Corrected Maglev behavior: it applies to external north-south traffic, not in-cluster socket load balancing.
- Corrected Cilium metrics access from port 9090 to the documented Cilium agent Prometheus port 9962.
- Corrected NodePort allocation guidance. Kubernetes controls the NodePort range with the API server `--service-node-port-range` flag; `nodePort.range` is not a valid Cilium Helm value for changing allocation.
- Replaced the rollback command that applied a raw manifest from Kubernetes `master` with a kubeadm addon phase command for kubeadm clusters.

## Review Notes
The guide is technically relevant and salvageable. Some operational areas remain environment-specific, especially managed Kubernetes kube-proxy removal, DSR compatibility, and rollback procedures outside kubeadm clusters.
