# Validation Summary: How to Install RKE2 on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- RKE2
- Kubernetes
- Ubuntu Linux
- systemd
- UFW
- kubectl
- RKE2 agent and server configuration

## Sources Consulted
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Token Management: https://docs.rke2.io/security/token
- SUSE RKE2 Support Matrix: https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-35/
- RKE2 Release Channels API: https://update.rke2.io/v1-release/channels
- Kubernetes Ports and Protocols: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- Kubernetes Swap Memory Management: https://kubernetes.io/docs/concepts/cluster-administration/swap-memory-management/
- Ubuntu Release Cycle: https://ubuntu.com/about/release-cycle

## Issues Found
- Ubuntu 20.04 LTS standard security maintenance ended in May 2025. Updated the guide to state that Ubuntu 20.04 should be used with Ubuntu Pro/ESM enabled.
- The prerequisites omitted AppArmor tools, which RKE2 requires when AppArmor is supported by the host kernel. Added this prerequisite.
- The firewall section opened internal cluster ports broadly and listed ports 10257 and 10259 as required external firewall rules. Updated the UFW examples to restrict RKE2 traffic to private node subnets, use the RKE2 documented etcd range 2379-2381, add the default Canal health-check port 9099, and move optional CNI/NodePort ports into an optional block.
- The swap comment said swap disabling is always required. Kubernetes now supports swap when explicitly configured, while the default kubelet behavior does not start with swap enabled. Updated the wording accordingly.
- The agent install and pinned-version install examples placed `INSTALL_RKE2_*` variables before `sudo`, which can prevent the RKE2 install script from receiving them. Changed the examples to use `sudo env ... sh -`.
- The pinned version example used the old `v1.28.8+rke2r1` release. Updated it to the current stable channel release verified on 2026-04-23: `v1.34.6+rke2r3`.

## Review Notes
The guide is a single-server quickstart with worker-node join instructions. HA clusters should use a stable registration address and appropriate `tls-san` configuration, and the `cattle-system` namespace only exists after Rancher-related components are installed. No live RKE2 cluster installation was performed during validation.
