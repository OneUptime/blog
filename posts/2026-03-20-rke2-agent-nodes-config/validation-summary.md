# Validation Summary: How to Configure RKE2 Agent Nodes - Config

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- RKE2
- Kubernetes
- RKE2 agent nodes
- kubelet
- kube-proxy
- containerd registry mirrors
- Kubernetes labels and taints
- GPU device plugins

## Sources Consulted
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Private Registry Configuration: https://docs.rke2.io/install/private_registry
- Kubernetes kubelet command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Kubernetes kube-proxy command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes removed feature gates reference: https://kubernetes.io/docs/reference/command-line-tools-reference/feature-gates-removed/
- Kubernetes Device Plugins: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/device-plugins/
- Kubernetes Taints and Tolerations: https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/

## Issues Found
- The GPU worker example set `feature-gates=DevicePlugins=true`. The `DevicePlugins` feature gate became GA and was removed from Kubernetes feature-gate configuration, so passing it to current kubelet versions can fail as an unrecognized feature gate. I removed that kubelet argument and replaced it with a comment noting that the NVIDIA device plugin should be installed after the node joins.
- The installer command used `INSTALL_RKE2_TYPE="agent" sudo sh -`, which may not reliably pass the environment variable through sudo. I changed it to `sudo env INSTALL_RKE2_TYPE="agent" sh -` so the RKE2 install script receives the agent install type.

## Review Notes
RKE2 v1.32 and later recommends kubelet configuration drop-in files for kubelet settings, while direct `kubelet-arg` entries remain documented as an option and are still needed for older supported minors. The post's `kubelet-arg` examples are valid, but future updates could mention the drop-in file approach for newer clusters.
