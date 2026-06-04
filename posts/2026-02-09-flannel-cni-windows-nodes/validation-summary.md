# Validation Summary: How to Set Up Flannel CNI for Windows Nodes in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Windows worker nodes
- Flannel
- Container Network Interface (CNI)
- containerd
- PowerShell
- Host Networking Service (HNS)
- VXLAN / win-overlay

## Sources Consulted
- Kubernetes documentation: Networking on Windows - https://kubernetes.io/docs/concepts/services-networking/windows-networking/
- Kubernetes documentation: Network Plugins - https://kubernetes.io/docs/concepts/cluster-administration/network-plugins/
- Kubernetes SIG Windows guide: Adding Windows nodes - https://github.com/kubernetes-sigs/sig-windows-tools/blob/master/guides/guide-for-adding-windows-node.md
- Flannel official repository and release manifest guidance - https://github.com/flannel-io/flannel
- Flannel CNI plugin documentation - https://github.com/flannel-io/cni-plugin
- containernetworking Windows CNI plugin documentation - https://www.cni.dev/plugins/current/main/win-overlay/
- containerd CRI configuration documentation - https://containerd.io/docs/1.7/cri/config/
- containerd Windows getting started documentation - https://containerd.io/docs/getting-started/

## Issues Found
- The Flannel manifest URL used the `master` branch raw file. Updated it to the official release download URL so readers get a released manifest.
- The Linux Flannel VXLAN ConfigMap did not set Windows-required VXLAN values. Added VNI `4096` and UDP port `4789`, which Kubernetes documents as required for Windows Flannel VXLAN.
- The prerequisites allowed Docker as the Windows runtime. Updated the post to use containerd, aligning with current Kubernetes/container runtime guidance after dockershim removal.
- The Windows setup downloaded `flanneld.exe` but did not install the Flannel CNI plugin executable. Added the official `flannel-io/cni-plugin` Windows asset and renamed `flannel-amd64.exe` to `flannel.exe` for the `type: flannel` CNI config.
- The Windows CNI plugin download URL pointed to a Microsoft repository/asset that does not match the referenced plugin package. Updated it to the official `containernetworking/plugins` Windows release archive.
- The Windows kubelet configuration included `cgroupDriver: systemd`, which is Linux-specific. Removed it from the Windows kubelet configuration.
- The Windows VXLAN backend config omitted `MacPrefix`. Added `MacPrefix: "0E-2A"` and matched the CNI delegate `endpointMacPrefix`.
- The Windows CNI delegate used `win-bridge` while the post configured the VXLAN backend. Changed it to `win-overlay`, which is the documented delegate for Flannel VXLAN on Windows.
- The kubelet configuration section used `--network-plugin`, `--cni-bin-dir`, and `--cni-conf-dir`, which Kubernetes removed in v1.24. Replaced that section with containerd CNI directory configuration guidance.
- The CNI troubleshooting command referenced the wrong CNI binary directory. Updated `CNI_PATH` and the plugin executable path to `C:\k\cni\bin`.
- The performance section suggested disabling IPv6 as an optimization. Removed it because it is not a Flannel performance tuning requirement and can break environments that rely on IPv6.

## Review Notes
The guide now reflects the supported VXLAN path for Flannel on Windows: Flannel delegates to `win-overlay`, uses VNI `4096` and UDP port `4789`, and relies on the container runtime to load CNI configuration on modern Kubernetes versions. The remaining manual containerd `config.toml` step is intentionally explicit because Windows containerd deployments can vary by installation method.
