# Validation Summary: Installing Cilium on K3s

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- K3s
- Kubernetes CNI
- Cilium
- Helm
- Cilium CLI
- Hubble

## Sources Consulted
- Cilium K3s installation guide: https://docs.cilium.io/en/stable/installation/k3s/
- Cilium Helm installation guide: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Cilium Helm reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium 1.16 upgrade guide: https://docs.cilium.io/en/v1.16/operations/upgrade/
- K3s basic network options: https://docs.k3s.io/networking/basic-network-options
- K3s server CLI reference: https://docs.k3s.io/cli/server
- K3s agent CLI reference: https://docs.k3s.io/cli/agent
- Cilium Helm chart values and templates for v1.19.3 from https://helm.cilium.io/cilium-1.19.3.tgz

## Issues Found
- The post enabled `kubeProxyReplacement=true` in Cilium but did not disable K3s kube-proxy. Added `--disable-kube-proxy` to the K3s server installation command because the Cilium K3s guide requires this when running Cilium without kube-proxy, and the K3s server CLI documents this flag as disabling kube-proxy.
- The Cilium Helm chart version was pinned to `1.16.5`, which is outdated relative to the current stable Cilium documentation. Updated the Helm commands to `1.19.3`, matching the current stable Cilium install docs consulted on 2026-05-08.
- The worker-node install command passed `--flannel-backend=none` to the K3s agent. K3s documents Flannel backend configuration as a server-side option, and the Cilium K3s guide joins agents with only `K3S_URL` and `K3S_TOKEN`. Removed the agent-side `INSTALL_K3S_EXEC` flag.
- The Cilium CLI install snippet downloaded only the amd64 archive and did not verify the checksum. Updated it to use the official architecture-aware Linux snippet for amd64/arm64 and added checksum verification.

## Review Notes
- The Helm values used in the post (`operator.replicas`, `ipam.operator.clusterPoolIPv4PodCIDRList`, `k8sServiceHost`, `k8sServicePort`, `kubeProxyReplacement`, `socketLB.enabled`, and Hubble settings) match documented Cilium Helm values.
- The Cilium pod label selectors used in the validation commands are valid for the checked Cilium Helm chart templates.
