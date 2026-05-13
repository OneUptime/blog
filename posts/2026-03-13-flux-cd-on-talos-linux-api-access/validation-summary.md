# Validation Summary: How to Set Up Flux CD on Talos Linux with API Access Only

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Flux CD
- Cilium CNI
- Helm
- GitOps

## Sources Consulted
- Talos Linux Getting Started documentation: https://docs.siderolabs.com/talos/v1.11/getting-started/getting-started
- Talos Linux Cilium deployment guide: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Talos Linux machine configuration reference: https://docs.siderolabs.com/talos/v1.11/reference/configuration/v1alpha1/config
- Talos Linux configuration patching documentation: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/system-configuration/patching
- Cilium Helm installation documentation: https://docs.cilium.io/en/stable/installation/k8s-install-helm/
- Flux GitHub bootstrap CLI documentation: https://fluxcd.io/flux/cmd/flux_bootstrap_github/

## Issues Found
- The post said Talos ships without a CNI. Talos machine configuration defaults to Talos-managed Flannel, so the guide now explicitly disables the default CNI with `cluster.network.cni.name: none` before installing Cilium.
- The Cilium install command enabled kube-proxy replacement but did not disable Talos-managed kube-proxy or set the required Cilium Helm values for Talos. Added `cluster.proxy.disabled: true`, `cleanCiliumState` capabilities, cgroup settings, and `k8sServiceHost` / `k8sServicePort`.
- The Cilium Helm command did not pin a chart version or update the Helm repo. Added `helm repo update` and `--version 1.19.3` to match current Cilium stable documentation.
- The guide showed nodes as `Ready` before installing the CNI. With the default CNI disabled, nodes are expected to be `NotReady` until Cilium is installed, so the expected output was corrected.
- The Talos client setup omitted `talosctl config endpoint`, which is part of the official setup flow before bootstrap and kubeconfig retrieval. Added the endpoint configuration command.
- The introduction used `taloscfg`, which is not the generated client config file name. Corrected it to `talosconfig`.
- The post stated Flux controllers will run on worker nodes. Kubernetes scheduling makes this likely in a normal multi-node cluster with worker nodes, but not guaranteed, so the wording was softened.
- Some drift and maintenance-window claims were too absolute or not tied to documented Talos behavior. Reworded them to describe API-driven maintenance and drift reduction more accurately.

## Review Notes
The corrected guide assumes Cilium kube-proxy replacement with KubePrism available on `localhost:7445`, matching the Talos and Cilium documentation paths consulted. In production, readers should align the Cilium chart version with their tested Talos and Kubernetes versions and avoid committing unencrypted Talos credentials.
