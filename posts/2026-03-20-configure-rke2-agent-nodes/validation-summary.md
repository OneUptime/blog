# Validation Summary: How to Configure RKE2 Agent Nodes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2 (Rancher Kubernetes Engine 2)
- Kubernetes (kubelet, kube-proxy, kubectl)
- containerd (RKE2's embedded runtime)
- systemd (rke2-agent.service)
- YAML configuration (config.yaml, registries.yaml)

## Sources Consulted
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Advanced Options: https://docs.rke2.io/advanced
- RKE2 Logging Reference: https://docs.rke2.io/reference/logging
- RKE2 CLI Tools Reference: https://docs.rke2.io/reference/cli_tools
- RKE2 Private Registry Configuration: https://docs.rke2.io/install/containerd_registry_configuration

## Issues Found
- **containerd socket path**: The "Useful Paths" table listed `/run/containerd/` as the containerd socket. RKE2 ships its own embedded containerd that listens on `/run/k3s/containerd/containerd.sock` (not the standard upstream path). Updated the table entry to the correct path. This matches what RKE2 docs and the bundled `crictl`/`ctr` defaults expect.

## Review Notes
- The agent install command (`curl -sfL https://get.rke2.io | INSTALL_RKE2_TYPE="agent" sh -`) and `rke2-agent.service` name are correct.
- Server registration port 9345 is correct (RKE2 supervisor port for agent join, distinct from the 6443 Kubernetes API port).
- All `config.yaml` keys used (`server`, `token`, `node-name`, `node-label`, `node-taint`, `kubelet-arg`) are valid RKE2 agent options.
- Kubelet logs path `/var/lib/rancher/rke2/agent/logs/kubelet.log` is correct per RKE2 logging docs.
- `registries.yaml` schema (`mirrors`, `endpoint`, `configs`, `auth`, `tls.insecure_skip_verify`) follows the RKE2 private registry format inherited from K3s/containerd.
- Kubelet flags shown (`max-pods`, `kube-reserved`, `system-reserved`, `eviction-hard`) are valid kubelet arguments and work via `kubelet-arg`.
- Minor consideration: kubelet now also supports config-file-based settings (KubeletConfiguration), but `kubelet-arg` remains supported in RKE2 and is the documented approach for inline overrides.
