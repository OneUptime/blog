# Validation Summary: How to Install RKE2 on Debian

## Status
validated

## Post Type
Tutorial / Installation guide

## Technologies Covered
- RKE2
- Kubernetes
- Debian 11 (Bullseye) and Debian 12 (Bookworm)
- systemd
- UFW, nftables, iptables/xtables-nft
- Canal CNI
- AppArmor

## Sources Consulted
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Network Options: https://docs.rke2.io/networking/basic_network_options
- RKE2 release channels endpoint: https://update.rke2.io/v1-release/channels
- Kubernetes kubeadm installation guide, swap configuration: https://v1-34.docs.kubernetes.io/docs/setup/production-environment/tools/kubeadm/install-kubeadm/
- Debian nftables documentation: https://wiki.debian.org/nftables
- Debian AppArmor package details: https://packages.debian.org/bookworm/apparmor
- Debian UFW manual source: https://sources.debian.org/src/ufw/0.36.2-9/doc/ufw.8

## Issues Found
- The post stated that RKE2 supports Debian-based systems. RKE2's official documentation says it generally works on Linux distributions that use systemd and iptables, so the wording was changed to avoid implying Debian-specific validation.
- The prerequisites omitted unique hostnames, which RKE2 requires for nodes unless `node-name` or `with-node-id` is configured. Added this prerequisite.
- The package list omitted AppArmor tooling and iptables/xtables-nft support needed by RKE2/Canal on typical Debian systems. Added `apparmor`, `iptables`, and `nftables`.
- The UFW rules omitted current RKE2 inbound ports for etcd metrics (`2381/tcp`), NodePort services (`30000-32767/tcp`), and Canal health checks (`9099/tcp`). Added those ports.
- The UFW rules opened RKE2 internode and CNI ports to all sources, while RKE2 documentation scopes these ports to RKE2 nodes and warns against exposing VXLAN broadly. Updated the rules to use an `RKE2_NODE_SUBNET` source.
- The optional pinned install example used an old RKE2 version and placed the install environment variable before `sudo`, which may not be preserved for the installer. Updated the example to the current stable channel version as of 2026-04-23 and used `sudo env`.
- The worker-node installer had the same `sudo` environment-variable issue. Updated it to `sudo env INSTALL_RKE2_TYPE="agent" sh -`.
- The worker-node instructions reused shell variables that were only defined on the server node. Added explicit worker-side placeholders for `SERVER_IP` and `SERVER_TOKEN`.
- The pod verification command filtered out all non-`Running` pods, but RKE2 startup jobs can legitimately be `Completed`. Changed it to show all pods and note that both `Running` and `Completed` are expected states.
- The Debian 12 nftables note said RKE2 automatically handles both iptables and nftables. Updated it to the more precise RKE2/Canal requirement for iptables or xtables-nft.

## Review Notes
- The current RKE2 channel endpoint on 2026-04-23 reported `stable` as `v1.34.6+rke2r3` and `latest` as `v1.35.3+rke2r3`; the guide uses the stable version for the pinned-version example.
- The guide still describes a basic single-server bootstrap plus worker nodes. A production high-availability deployment would also need multiple server nodes and an API endpoint/load balancer.
