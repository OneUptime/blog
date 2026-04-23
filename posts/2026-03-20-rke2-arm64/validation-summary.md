# Validation Summary: How to Set Up RKE2 on ARM64 Architecture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- kubelet configuration
- ARM64/AArch64 Linux
- systemd
- Canal/Flannel CNI networking
- Docker/OCI container images

## Sources Consulted
- RKE2 Requirements: https://docs.rke2.io/install/requirements
- RKE2 Quick Start: https://docs.rke2.io/install/quickstart
- RKE2 Configuration Options: https://docs.rke2.io/install/configuration
- RKE2 Installation Methods: https://docs.rke2.io/install/methods
- RKE2 Air-Gap Install: https://docs.rke2.io/install/airgap
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- RKE2 Agent Configuration Reference: https://docs.rke2.io/reference/linux_agent_config
- RKE2 v1.34.6+rke2r3 GitHub release: https://github.com/rancher/rke2/releases/tag/v1.34.6%2Brke2r3
- RKE2 release channels API: https://update.rke2.io/v1-release/channels
- SUSE RKE2 v1.34 Support Matrix: https://www.suse.com/suse-rke2/support-matrix/all-supported-versions/rke2-v1-34/
- Kubernetes kubelet configuration file documentation: https://kubernetes.io/docs/tasks/administer-cluster/kubelet-config-file/
- Kubernetes kubelet configuration directory merging: https://kubernetes.io/docs/reference/node/kubelet-config-directory-merging/
- Kubernetes kubelet CLI reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kubelet/
- Docker Hub nginx official image: https://hub.docker.com/_/nginx/

## Issues Found
- The prerequisites understated RKE2 hardware requirements for agent nodes. Updated the RAM/CPU guidance to match RKE2's documented minimum of 2 CPU and 4GB RAM for Linux nodes.
- The port list omitted ports required by default Canal VXLAN networking and multi-server etcd. Added UDP 8472, TCP 9099, and etcd ports 2379-2381 where applicable.
- The platform list implied Apple Silicon could run RKE2 directly. Clarified that Apple Silicon requires a Linux VM for development use.
- The binary verification command assumed a tarball install path of `/usr/local/bin/rke2`. Replaced it with `command -v rke2` so it also works for RPM installs that place files under `/usr`.
- The specific-version and air-gap examples used outdated RKE2 v1.28.8+rke2r1. Updated them to the stable channel release v1.34.6+rke2r3 current on 2026-04-23 and verified the ARM64 release artifacts exist.
- The installer pipeline placed environment variables before `sudo`, which can drop them under sudo's environment handling. Moved `INSTALL_RKE2_VERSION` and `INSTALL_RKE2_TYPE` after `sudo`, matching supported usage.
- The air-gapped install manually extracted the tarball and skipped checksum-based offline installer handling. Replaced it with the documented `INSTALL_RKE2_ARTIFACT_PATH` workflow using the install script and `sha256sum-arm64.txt`.
- The server kubelet tuning used deprecated kubelet CLI flags through `kubelet-arg`. Replaced these with a `KubeletConfiguration` drop-in file supported by current RKE2/Kubernetes.
- The worker-node section attempted to read the server node token on the worker. Split the instructions so the token is read on the server and then assigned on each worker node.
- The 4GB-node tuning example also used deprecated kubelet CLI flags. Replaced it with an equivalent `KubeletConfiguration` snippet.

## Review Notes
The corrected guide remains a single-server oriented setup. High-availability RKE2 clusters need additional planning for odd server counts, fixed registration endpoints, datastore backup, and load balancing.
