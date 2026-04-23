# Validation Summary: How to Install RKE2 on SLES

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- RKE2
- Kubernetes
- SUSE Linux Enterprise Server (SLES)
- SUSEConnect and zypper
- systemd
- firewalld
- AppArmor
- kube-proxy
- Canal CNI

## Sources Consulted
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Known Issues and Limitations: https://docs.rke2.io/known_issues
- SUSE RKE2 v1.30 Support Matrix: https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-30/
- SUSE RKE2 v1.33 Support Matrix: https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-33/
- SUSE SLES Modules and Extensions Quick Start: https://documentation.suse.com/sles/15-SP5/single-html/SLES-modules/
- SUSE SLES registration documentation: https://documentation.suse.com/sles/15-SP4/html/SLES-all/cha-register-sle.html
- SUSE AppArmor documentation: https://documentation.suse.com/sles/15-SP4/html/SLES-all/cha-apparmor-start.html
- SUSE RKE2 on SLES Technical Reference Documentation: https://documentation.suse.com/trd/suse/single-html/kubernetes_ri_rke2-sles/index.html
- Kubernetes kube-proxy reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes nftables mode for kube-proxy: https://kubernetes.io/blog/2025/02/28/nftables-kube-proxy/

## Issues Found
- The post claimed RKE2 supports "SLES 15 SP3 and later" as a blanket statement. RKE2's validated SLES service packs vary by RKE2 minor version, so the intro and prerequisites now direct readers to the RKE2 Support Matrix for their target version.
- The Containers Module activation command was hard-coded to SLES 15 SP5 on x86_64. It now derives the service-pack version and architecture from the host.
- The guide did not install `apparmor-parser`, which SUSE's RKE2-on-SLES guidance requires when the host kernel supports AppArmor. The package install was added.
- The sysctl configuration missed `net.ipv4.conf.all.forwarding=1`, which RKE2 documents as important on systems using Wicked. The persistent sysctl config now includes it.
- The firewalld section enabled firewalld and opened ports, but current RKE2 known issues state that firewalld conflicts with the default Canal CNI. The section now disables firewalld for default Canal and lists the official external firewall/security-group ports.
- The firewall port list was incomplete for RKE2 and default Canal networking. It now includes the official RKE2 ports, Canal VXLAN health port, NodePort range, and notes WireGuard ports as conditional.
- The server config forced `kube-proxy` into nftables mode as "SLES-specific." That is not SLES-specific and requires a compatible Kubernetes version, kernel, CNI, and `nft` tool. The unsafe default was removed.
- The agent install command placed `INSTALL_RKE2_TYPE` before `sudo`, which can be dropped by sudo environment handling. It now uses `sudo env INSTALL_RKE2_TYPE="agent" sh -`.
- The kernel feature check used `/proc/config.gz`, which is not reliably available on SLES systems. It now reads `/boot/config-$(uname -r)`.

## Review Notes
- The RKE2 installer currently uses the tarball path by default for SLES 15, so the `/usr/local` verification commands are plausible for the SLES versions covered here.
- Firewall ports may differ if the cluster uses a non-default CNI or exposes NodePort services differently.
- kube-proxy nftables mode can be considered for newer clusters only after verifying Kubernetes version, kernel version, `nft` version, and CNI compatibility.
