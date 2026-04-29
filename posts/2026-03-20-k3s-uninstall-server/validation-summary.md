# Validation Summary: How to Uninstall K3s Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- `kubectl`
- systemd
- Linux networking
- `iptables` / `ip6tables`

## Sources Consulted
- K3s uninstall documentation: https://docs.k3s.io/installation/uninstall
- K3s killall / stop documentation: https://docs.k3s.io/upgrades/killall
- K3s cluster access documentation: https://docs.k3s.io/cluster-access
- K3s networking documentation: https://docs.k3s.io/networking/basic-network-options
- K3s install script source: https://github.com/k3s-io/k3s/blob/master/install.sh
- K3s kubeconfig template source: https://github.com/k3s-io/k3s/blob/master/pkg/daemons/control/deps/deps.go
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes `kubectl config` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/
- Kubernetes `kubectl config delete-cluster` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_config/kubectl_config_delete-cluster/

## Issues Found
- The manual cleanup path omitted `k3s-killall.sh`, even though the official uninstall flow uses it to stop pods/containers and remove networking state. I added a conditional `k3s-killall.sh` step and matched the upstream uninstall flow more closely.
- The post advised deleting `/var/lib/containerd`, `/etc/cni/net.d`, and `/opt/cni/bin`. Those are not the default K3s-owned paths in the official install/uninstall flow and may belong to other runtimes or CNIs. I removed those commands and kept the K3s-owned paths such as `/var/lib/rancher/k3s`, `/run/k3s`, `/run/flannel`, `/var/lib/kubelet`, and `/var/lib/cni`.
- The iptables cleanup commands flushed entire tables and reset default policies, which is broader than K3s cleanup and can remove unrelated firewall rules. I replaced them with the targeted `iptables-save | ... | iptables-restore` pattern used by the official K3s killall script.
- The kubeconfig cleanup commands used incorrect entry names (`k3s-cluster` and `k3s-context`). Current K3s generates default kubeconfig entries named `local`, `Default`, and `user`. I corrected the commands and added `delete-user`.
- The kubeconfig cleanup step assumed `kubectl` would still be present after uninstall. The official uninstall flow removes bundled CLI tool symlinks, including the K3s-provided `kubectl` symlink when applicable. I made that step conditional on having a separate `kubectl` installed.
- The verification commands were slightly misleading: `ps aux | grep k3s` would match the `grep` process itself, and the final data-directory check looked at `/var/lib/rancher` instead of the K3s directory. I corrected those commands.
- The pre-uninstall section deleted agent node objects but did not show deleting the server node object before a reinstall/rejoin. I added that conditional step to match K3s guidance about removing the node so its node-password secret is cleaned up.

## Review Notes
- The post is now technically accurate for current K3s documentation as of 2026-04-29.
- K3s also supports OpenRC installs; this guide remains systemd-focused, which is fine for common Linux server setups but not universal.
- If a cluster uses Cilium instead of the default Flannel networking, K3s documentation requires manually removing `cilium_host`, `cilium_net`, and `cilium_vxlan` before running `k3s-killall.sh` or `k3s-uninstall.sh`.
