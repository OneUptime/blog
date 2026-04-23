# Validation Summary: How to Install RKE2 on Rocky Linux

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- RKE2
- Kubernetes
- Rocky Linux 8 and 9
- Rancher
- SELinux
- NetworkManager
- Canal CNI
- firewalld
- systemd
- kubectl

## Sources Consulted
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 Known Issues and Limitations: https://docs.rke2.io/known_issues
- RKE2 SELinux documentation: https://docs.rke2.io/security/selinux
- RKE2 Cluster Access: https://docs.rke2.io/cluster_access
- RKE2 CLI Tools: https://docs.rke2.io/reference/cli_tools
- SUSE RKE2 support matrix: https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-35/
- Kubernetes cgroup v2 documentation: https://kubernetes.io/docs/concepts/architecture/cgroups/
- Red Hat Enterprise Linux 9 cgroup v2 documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/

## Issues Found
- The prerequisites named Rocky Linux 8.6+ and 9.x directly. Updated this to require a Rocky Linux 8 or 9 release from the RKE2 support matrix, because supported OS minors vary by RKE2 minor release.
- The prerequisites omitted RKE2's unique node name requirement. Added unique hostnames for all nodes.
- The system preparation step changed SELinux to permissive mode. Updated it to keep SELinux enforcing and explicitly enable SELinux support in the RKE2 config, matching current RKE2 SELinux guidance for RPM-based installs.
- The post did not account for NetworkManager interference with Canal-managed interfaces. Added the documented NetworkManager unmanaged-devices configuration for Canal.
- The firewall section enabled and configured firewalld. Replaced it with guidance to disable firewalld on RKE2 nodes and use an external firewall/security group, because RKE2 documents firewalld conflicts with the default Canal networking stack.
- The firewall port list included unnecessary control-plane component ports and missed current RKE2/Canal ports. Replaced it with the documented RKE2 server, etcd, kubelet, Canal, WireGuard, and optional NodePort ports.
- The install section listed tarball paths under `/usr/local` for Rocky Linux. Updated the paths to RPM-based locations under `/usr`.
- The server config set `container-runtime-endpoint: ""`, which is only needed when disabling embedded containerd for an alternate CRI socket. Removed it to avoid a misleading or potentially invalid configuration.
- The CNI comment implied the default CNI should be disabled. Updated it to state that Canal is the default and `cni` only needs to be set when choosing a different plugin.
- The worker install command set `INSTALL_RKE2_TYPE` before `sudo`, which can be dropped by sudo's environment handling. Changed it to `sudo env INSTALL_RKE2_TYPE="agent" sh -`.
- The Rocky Linux 9 section described the firewalld nftables backend as compatible. Replaced that with a check that firewalld remains disabled and noted Canal's iptables/xtables-nft requirement.

## Review Notes
The installation commands were reviewed against official documentation rather than executed, because running them would install and start RKE2 on the review host. The post now tracks current RKE2 guidance, but the support matrix should still be checked for the exact RKE2 minor version being installed.
