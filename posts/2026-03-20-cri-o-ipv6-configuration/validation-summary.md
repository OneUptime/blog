# Validation Summary: How to Configure CRI-O with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- CRI-O (container runtime)
- IPv6 / dual-stack networking
- CNI (Container Network Interface) — bridge, host-local IPAM, portmap, loopback plugins
- Linux kernel sysctl (IPv6 forwarding, bridge-netfilter)
- Kubernetes (kubeadm, ClusterConfiguration v1beta3)
- Flannel CNI
- crictl
- OpenShift 4.x (install-config, OVNKubernetes)

## Sources Consulted
- CRI-O install docs / packaging README: https://github.com/cri-o/cri-o/blob/main/install.md
- CRI-O packaging migration to `pkgs.k8s.io` and `download.opensuse.org/repositories/isv:/cri-o`
- Flannel configuration documentation: https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md
- CNI plugin reference (bridge + host-local IPAM `ranges`/`routes` schema): https://www.cni.dev/plugins/current/main/bridge/ and https://www.cni.dev/plugins/current/ipam/host-local/
- Kubernetes dual-stack docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- kubeadm ClusterConfiguration v1beta3 reference: https://kubernetes.io/docs/reference/config-api/kubeadm-config.v1beta3/
- OpenShift networking docs (OVNKubernetes dual-stack)
- IPv6 addressing rules (RFC 4291): hex digits 0-9, a-f only

## Issues Found

1. **Invalid IPv6 addresses (critical).** Several IPv6 prefixes used non-hex characters, which makes them syntactically invalid (IPv6 segments must use 0-9 and a-f only):
   - `fd00:crio::/64` — `r`, `i`, `o` are not hex digits.
   - `fd00:crio::/48` — same problem (used in `kubeadm-config.yaml` `podSubnet` and Flannel `IPv6Network`).
   - `fd00:svc::/108` — `s` and `v` are not hex digits (used in `serviceSubnet`).

   Fixed by replacing with valid ULA prefixes:
   - Bridge IPAM `fd00:crio::/64` → `fd00:cafe::/64`
   - Pod CIDR `fd00:crio::/48` → `fd00:cafe::/48` (in both kubeadm and Flannel configs)
   - Service CIDR `fd00:svc::/108` → `fd00:abcd::/108`

2. **Outdated CRI-O package repository URLs.** The post used the OpenSUSE Kubic OBS repos (`devel:/kubic:/libcontainers:/stable:/cri-o:/...`), which were deprecated in mid-2023. The current install path uses `pkgs.k8s.io` for the Kubernetes core packages and `download.opensuse.org/repositories/isv:/cri-o:/stable:/...` for CRI-O. Additionally, `cri-o-runc` is no longer a separate package — the modern `cri-o` deb bundles its runtime dependencies. The install snippet has been updated to use the current keyring + signed-by apt source pattern and to install only the `cri-o` package.

## Review Notes
- CRI-O v1.29 itself is now end-of-life upstream. The post is pinned to that version (matching Kubernetes 1.29) and the install commands continue to work, but readers deploying new clusters in 2026 should consider a supported minor (v1.31+ as of writing).
- `EnableNFTables: false` in the Flannel `net-conf.json` is a valid (but experimental) Flannel field — leaving it explicitly disabled is fine.
- The `[crio.network]` TOML keys (`network_dir`, `plugin_dirs`) are correct for CRI-O.
- The CNI bridge + host-local IPAM `ranges`/`routes` schema matches the CNI 1.0.0 reference for dual-stack.
- The OpenShift `install-config.yaml` IPv6 prefixes (`fd01::/48`, `fd02::/112`, `fd00::/48`) are all valid hex and were not changed. `OVNKubernetes` is correctly identified as the network type required for dual-stack on OpenShift 4.
- The `crictl` invocations and `nsenter`/`journalctl` verification commands are correct.
