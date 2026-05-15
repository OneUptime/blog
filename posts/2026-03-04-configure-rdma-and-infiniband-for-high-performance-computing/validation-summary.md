# Validation Summary: How to Configure RDMA and InfiniBand for High-Performance Computing on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- RDMA
- InfiniBand
- IP over InfiniBand (IPoIB)
- NetworkManager / nmcli
- OpenSM
- libibverbs and InfiniBand diagnostic tools

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring InfiniBand and RDMA networks: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_infiniband_and_rdma_networks/
- Red Hat Enterprise Linux 9 documentation: Configuring the core RDMA subsystem: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_infiniband_and_rdma_networks/configuring-the-core-rdma-subsystem_configuring-infiniband-and-rdma-networks
- Red Hat Enterprise Linux 9 documentation: Configuring IPoIB: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_infiniband_and_rdma_networks/configuring-ipoib_configuring-infiniband-and-rdma-networks
- Red Hat Enterprise Linux 9 documentation: Increasing the amount of memory that users are allowed to pin in the system: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_infiniband_and_rdma_networks/increasing-the-amount-of-memory-that-users-are-allowed-to-pin-in-the-system_configuring-infiniband-and-rdma-networks
- Local `nmcli connection add help` output for current InfiniBand connection option syntax.

## Issues Found
- The original post used placeholders such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>`, which do not configure RDMA or InfiniBand on RHEL. Replaced them with concrete RHEL commands for installing `rdma-core`, `opensm`, `libibverbs-utils`, and `infiniband-diags`.
- The original post omitted the InfiniBand subnet manager requirement. Added OpenSM setup guidance for fabrics without an embedded switch subnet manager.
- The original post did not include an IPoIB configuration. Added a validated `nmcli connection add type infiniband` example using supported InfiniBand options.
- The original verification and troubleshooting commands checked a generic service rather than RDMA/InfiniBand state. Replaced them with `ibv_devices`, `ibv_devinfo`, `ibstat`, `ip addr show`, OpenSM logs, and package checks.
- The original post did not mention memory pinning requirements for non-root RDMA workloads. Added the RHEL-documented `memlock` limits guidance.

## Review Notes
The article is now technically relevant and command examples align with RHEL 9 documentation. The guide remains a basic single-host setup; production HPC clusters should also document hardware-specific adapter names, switch subnet manager configuration, partition design, routing, and workload-level RDMA validation.
