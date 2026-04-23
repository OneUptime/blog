# Validation Summary: How to Install RKE2 on CentOS

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- RKE2
- Kubernetes
- CentOS Stream
- CentOS Linux 7 and 8
- Enterprise Linux / RHEL-compatible distributions
- Rancher
- SELinux
- NetworkManager
- Canal CNI
- firewalld
- systemd
- kubectl

## Sources Consulted
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Known Issues and Limitations: https://docs.rke2.io/known_issues
- RKE2 SELinux documentation: https://docs.rke2.io/security/selinux
- RKE2 Cluster Access: https://docs.rke2.io/cluster_access
- SUSE RKE2 v1.35 support matrix: https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-35/
- CentOS Linux 8 EOL notice: https://www.centos.org/centos-linux-eol/
- CentOS Linux 7 EOL notice: https://blog.centos.org/2023/04/end-dates-are-coming-for-centos-stream-8-and-centos-linux-7/
- Red Hat Enterprise Linux 8 package manifest for package naming: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/package_manifest/package_manifest
- Red Hat Enterprise Linux 9 package manifest for package naming: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/package_manifest/index

## Issues Found
- The post described CentOS 7 and CentOS 8 as production-ready RKE2 targets. Updated the description, prerequisites, CentOS-specific section, and conclusion to state that CentOS Linux 7 reached EOL on June 30, 2024 and CentOS Linux 8 reached EOL on December 31, 2021, and to direct production users to the current RKE2 support matrix.
- The prerequisites omitted RKE2's unique node name requirement. Added unique hostnames for all nodes.
- The system preparation step disabled SELinux. RKE2 documents SELinux support on CentOS/RHEL-family systems, so the guide now keeps SELinux enforcing and enables SELinux support in the RKE2 server and agent configuration.
- The post did not include RKE2's documented NetworkManager workaround for Canal-managed interfaces. Added the `rke2-canal.conf` unmanaged-devices configuration and reload step.
- The firewall section enabled and configured `firewalld`. RKE2 documents conflicts between `firewalld` and the default Canal CNI, so this was replaced with disabling `firewalld` and listing the documented external firewall/security-group ports.
- The firewall port list included unnecessary control-plane component ports and missed current RKE2/Canal ports. Replaced it with RKE2 API, supervisor, etcd, kubelet, Canal, optional WireGuard, and optional NodePort ports.
- The dependency commands used `yum`, the wrong `conntrack` package name for RHEL-family systems, and did not account for Enterprise Linux 9 `iptables-nft` or Enterprise Linux 10 `kernel-modules-extra` requirements. Updated the commands to use `dnf`, `conntrack-tools`, an `iptables-nft`/`iptables` fallback, and the RHEL 10 `kernel-modules-extra` check.
- The server config allowed regular-user `kubectl` commands without making the generated kubeconfig readable. Added `write-kubeconfig-mode: "0644"` to match the subsequent verification commands.
- The worker install command set `INSTALL_RKE2_TYPE` before `sudo`, which can be dropped by sudo environment handling. Changed it to `sudo env INSTALL_RKE2_TYPE="agent" sh -`.
- The CentOS 7 kernel/ELRepo section recommended a newer kernel for eBPF even though the guide uses RKE2's default Canal CNI and current RKE2 production guidance should avoid EOL CentOS Linux 7. Replaced the section with explicit CentOS Linux 7/8 EOL guidance.

## Review Notes
The installation commands were reviewed against official documentation rather than executed, because running them would install and start RKE2 on the review host. CentOS Stream may work for labs because RKE2 generally works on systemd/iptables Linux distributions, but production support should be checked against the SUSE RKE2 support matrix for the exact RKE2 minor version being installed.
