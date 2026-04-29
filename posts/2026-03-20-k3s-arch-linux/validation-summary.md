# Validation Summary: How to Install K3s on Arch Linux

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- K3s
- Kubernetes
- Arch Linux
- systemd
- iptables / nftables
- Linux cgroups and swap configuration

## Sources Consulted
- K3s Quick-Start Guide: https://docs.k3s.io/quick-start
- K3s Installation Requirements: https://docs.k3s.io/installation/requirements
- K3s Configuration Options: https://docs.k3s.io/installation/configuration
- K3s Cluster Access: https://docs.k3s.io/cluster-access
- K3s CLI Tools: https://docs.k3s.io/cli
- K3s Agent CLI: https://docs.k3s.io/cli/agent
- K3s Server CLI: https://docs.k3s.io/cli/server
- K3s Known Issues: https://docs.k3s.io/known-issues
- K3s Manual Upgrades: https://docs.k3s.io/upgrades/manual
- K3s release channels API: https://update.k3s.io/v1-release/channels
- Kubernetes swap memory management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Arch Linux `iptables` package: https://archlinux.org/packages/core/x86_64/iptables/
- ArchWiki cgroups: https://wiki.archlinux.org/title/cgroups
- AUR `k3s-bin` package page: https://aur.archlinux.org/packages/k3s-bin
- AUR `k3s-bin` PKGBUILD: https://aur.archlinux.org/cgit/aur.git/plain/PKGBUILD?h=k3s-bin

## Issues Found
- The post described the non-AUR path as a manual or direct-binary install, but the commands actually used the official K3s install script. I updated the description, introduction, and step heading to match the method shown.
- The `modprobe` example passed multiple module names without `-a`. I changed it to `sudo modprobe -a ...` because current `modprobe` requires `-a` when inserting multiple modules in one command.
- The swap section called `/dev/zram0` "zswap" and lumped `zswap` together with `systemd-swap`. I corrected that wording to refer to zram-backed swap and limited the service guidance to `systemd-swap`.
- The cgroup section suggested adding `systemd.unified_cgroup_hierarchy=1` in GRUB. I removed that because current Arch uses cgroup v2 by default, and the K3s docs only call out special cgroup boot configuration for specific environments such as Raspberry Pi OS.
- The iptables section used the stale Arch package name `iptables-nft` and incorrectly told readers to enable `iptables` and `ip6tables` services. I updated it to the current Arch package name `iptables` and removed the service-enable instructions, since K3s needs the userspace tools available, not the standalone firewall-rule restore services.
- The kubectl section assumed a standalone `/usr/local/bin/kubectl` was always present. I changed the examples to use `k3s kubectl`, exported `KUBECONFIG=~/.kube/config` so the non-root examples work after copying the kubeconfig, and noted that the standalone `kubectl` symlink is specific to the install-script path.
- The agent-node section assumed a literal `ArchK3sToken`, which is not valid for an AUR-installed server unless the user manually set that token. I replaced it with `SERVER_NODE_TOKEN`, pointed readers to `/var/lib/rancher/k3s/server/node-token`, and fixed the `INSTALL_K3S_EXEC` example so the environment variable is passed safely through `sudo`.
- The update section pinned an outdated K3s version (`v1.29.1+k3s1`) and used the same brittle environment-variable placement. I replaced it with a stable-channel example for the install script and updated the AUR command to `yay -Syu k3s-bin`.

## Review Notes
- The network-policy troubleshooting module list is kernel-dependent; on some systems those modules may already be built in or auto-loaded.
- The post now reflects K3s and Arch package state as validated on 2026-04-29.
