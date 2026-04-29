# Validation Summary: How to Uninstall K3s Agent

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- `kubectl`
- Linux networking (`ip`, `iptables`, `ip6tables`)
- `systemd`

## Sources Consulted
- K3s official uninstall documentation: https://docs.k3s.io/installation/uninstall
- K3s official networking documentation: https://docs.k3s.io/networking/basic-network-options
- K3s official architecture and node registration documentation: https://docs.k3s.io/architecture
- K3s official install script source: https://raw.githubusercontent.com/k3s-io/k3s/master/install.sh
- Kubernetes `kubectl cordon` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cordon/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes generated `kubectl` command reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post stated that K3s always installs `/usr/local/bin/k3s-agent-uninstall.sh` on agent nodes. I changed this to say the script is generated when K3s is installed using the official installation script, which matches the K3s uninstall documentation.
- The manual cleanup section blindly removed `/usr/local/bin/kubectl`, `/usr/local/bin/crictl`, and `/usr/local/bin/ctr`. I changed this to remove only K3s-managed symlinks and added cleanup of `k3s-killall.sh`, matching the official installer's uninstall behavior.
- The data cleanup section removed `/var/lib/containerd`, `/etc/cni/net.d`, and `/opt/cni/bin`. These are not removed by the upstream K3s uninstall script and may belong to other runtimes or CNI installations, so I replaced them with K3s-owned paths and added `/run/flannel`.
- The manual cleanup path skipped mount-point and CNI namespace cleanup that K3s performs before deleting kubelet and runtime directories. I added unmount and `ip netns` cleanup so the fallback path better matches upstream behavior.
- The network cleanup step deleted generic `veth*` interfaces. I replaced this with the targeted interface cleanup used by K3s itself (`cni0`, flannel variants, and `kube-ipvs0` plus interfaces enslaved to `cni0`).
- The iptables cleanup step flushed all chains, reset default policies, and saved a new firewall ruleset. That could destroy unrelated host firewall configuration, so I replaced it with the targeted `iptables-save | grep -v ... | iptables-restore` approach used by the official `k3s-killall.sh` logic.
- The verification step checked `/var/lib/rancher` broadly instead of the actual K3s directories. I updated it to verify the specific K3s paths and interface names that should be gone.

## Review Notes
- The manual fallback example is now explicitly marked as `systemd`-based. Hosts using OpenRC should prefer the generated uninstall script or adapt the service-management commands accordingly.
- If the cluster uses a custom CNI instead of the default Flannel setup, additional plugin-specific cleanup may be required. K3s documents extra Cilium cleanup steps in the networking documentation.
