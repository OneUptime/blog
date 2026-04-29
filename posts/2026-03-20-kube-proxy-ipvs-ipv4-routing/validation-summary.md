# Validation Summary: How to Configure kube-proxy in IPVS Mode for IPv4 Service Routing

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- kube-proxy
- IPVS
- `kubectl`
- `ipvsadm`
- Linux kernel modules

## Sources Consulted
- Kubernetes: Virtual IPs and Service Proxies - https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes: kube-proxy Configuration (v1alpha1) - https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes: kube-proxy command reference - https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes: Reconfiguring a kubeadm cluster - https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-reconfigure/
- Kubernetes: Debug Services - https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes: Using Source IP - https://kubernetes.io/docs/tutorials/services/source-ip/
- Kubernetes Blog: NFTables mode for kube-proxy - https://kubernetes.io/blog/2025/02/28/nftables-kube-proxy/
- Debian Manpages: `ipvsadm(8)` - https://manpages.debian.org/testing/ipvsadm/ipvsadm.8.en.html

## Issues Found
- The `/etc/modules` persistence example used shell redirection without elevated write permissions. I changed it to `sudo tee -a /etc/modules` so the command works as written.
- The post later tells readers to switch the scheduler to `lc`, but the prerequisites only loaded `rr`, `wrr`, and `sh` scheduler modules. I added `ip_vs_lc` and clarified that scheduler availability depends on the modules present on the node.
- The kube-proxy ConfigMap edit instructions were too imprecise. I clarified that the kube-proxy configuration is stored under `data.config.conf`, matching current kubeadm documentation.
- The verification step relied on a specific log string. I replaced that with a check of the ConfigMap contents and the documented kube-proxy `http://localhost:10249/proxyMode` endpoint on a node.
- The scheduler list was incomplete relative to current Kubernetes documentation and described `sh` as session persistence, which is misleading. I updated the list to match current documented schedulers and removed the persistence claim.
- The performance comparison included unsupported claims such as memory usage and "IPVS internal" connection tracking. I replaced those rows with current upstream-documented differences around lookup behavior, synchronization performance, throughput, and balancing options.
- The `ipvsadm` command under "Monitoring IPVS Connections" was incorrect for the stated purpose. `--stats` shows statistics, not active connections, so I changed it to `-c`.
- The recommendation language was outdated. Kubernetes deprecated IPVS proxy mode in v1.35 and now recommends `nftables` as the replacement, so I updated the description, introduction, comparison section, and conclusion to reflect current upstream guidance.

## Review Notes
- The post is now technically correct, but it is version-sensitive. For modern Linux nodes that support it, upstream Kubernetes recommends evaluating `nftables` before choosing IPVS.
- The instructions assume a kube-proxy ConfigMap and DaemonSet workflow like the one kubeadm deploys. Some managed distributions may package or manage kube-proxy differently.
