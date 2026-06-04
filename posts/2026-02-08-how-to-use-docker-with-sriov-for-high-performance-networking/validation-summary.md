# Validation Summary: How to Use Docker with SRIOV for High-Performance Networking

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Docker Engine networking
- Docker Compose
- SR-IOV virtual functions
- Linux PCI sysfs SR-IOV controls
- Linux `ip link` VF configuration
- Mellanox/NVIDIA Docker SR-IOV network plugin
- Kubernetes SR-IOV Network Device Plugin
- DPDK and `vfio-pci`
- macvlan networking

## Sources Consulted
- Linux kernel PCI SR-IOV howto: https://www.kernel.org/doc/html/v6.1/PCI/pci-iov-howto.html
- Docker `network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker macvlan driver documentation: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker managed plugin documentation and `docker plugin ls` reference: https://docs.docker.com/engine/extend/ and https://docs.docker.com/reference/cli/docker/plugin/ls/
- Docker Hub `rdma/sriov-plugin` quickstart and options: https://hub.docker.com/r/rdma/sriov-plugin
- NVIDIA/Mellanox Docker SR-IOV documentation: https://docs.nvidia.com/networking/display/mlnxofedv561033/docker%2Busing%2Bsr-iov
- Kubernetes SR-IOV Network Device Plugin README/configuration reference: https://github.com/k8snetworkplumbingwg/sriov-network-device-plugin
- DPDK `dpdk-devbind` documentation: https://doc.dpdk.org/guides-25.07/tools/devbind.html
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Local command help for `docker network create` and `ip link`

## Issues Found
- The opening explanation overstated SR-IOV as bypassing the kernel networking stack almost entirely for the Docker kernel-driver path. Changed it to say SR-IOV bypasses Docker's bridge and NAT path, which matches the plugin-based Docker setup.
- The prerequisites conflated Docker and Kubernetes networking components. Changed the wording to distinguish Docker's SR-IOV network plugin from `sriov-cni` for Kubernetes/CNI deployments.
- The plugin verification command used `docker plugin ls`, which applies to managed Docker Engine plugins. The referenced `rdma/sriov-plugin` runs as a privileged container/legacy network plugin, so the verification command was changed to `docker ps --filter ancestor=rdma/sriov-plugin`.
- The SR-IOV Network Device Plugin section implied it was useful for Docker device-pool management. Changed it to explicitly describe the Kubernetes/kubelet use case, corrected the repository to `k8snetworkplumbingwg/sriov-network-device-plugin`, and changed the build target from `make build` to the documented `make image`.
- The macvlan example claimed to assign a specific VF but used the PF (`eth0`) as the macvlan parent. Updated the example to identify a VF netdevice and use that VF as the `parent`.
- The container verification commands assumed `nginx:alpine` already had `ip` and `ethtool`. Added an `apk add --no-cache iproute2 ethtool` step before running those tools.
- The DPDK binding example hard-coded `iavf` as the current VF driver. Updated it to discover the currently bound kernel driver before unbinding, making the example valid for non-Intel or differently bound VFs.

## Review Notes
The performance table is plausible but hardware, driver, offload, MTU, CPU pinning, interrupt, and workload dependent. It should be treated as illustrative rather than guaranteed benchmark output.
