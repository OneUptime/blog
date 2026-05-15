# Validation Summary: How to Configure InfiniBand Adapters with RDMA on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- InfiniBand
- RDMA
- IP over InfiniBand (IPoIB)
- OpenSM
- NetworkManager/nmcli
- rdma-core, libibverbs, librdmacm, infiniband-diags

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring the core RDMA subsystem": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_infiniband_and_rdma_networks/configuring-the-core-rdma-subsystem_configuring-infiniband-and-rdma-networks
- Red Hat Enterprise Linux 9 documentation, "Configuring IPoIB": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_infiniband_and_rdma_networks/configuring-ipoib_configuring-infiniband-and-rdma-networks
- Red Hat Enterprise Linux 9 documentation, "InfiniBand subnet manager": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_infiniband_and_rdma_networks/infiniband-subnet-manager_configuring-infiniband-and-rdma-networks
- Red Hat Enterprise Linux 8 documentation, "Configuring the rdma service": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_infiniband_and_rdma_networks/configuring-the-rdma-service_configuring-infiniband-and-rdma-networks
- rdma-core rping(1) manual page: https://man.archlinux.org/man/extra/rdma-core/rping.1.en
- ibv_devices(1) and ibv_devinfo(1) Linux manual pages: https://man7.org/linux/man-pages/man1/ibv_devices.1.html and https://man7.org/linux/man-pages/man1/ibv_devinfo.1.html
- ibping(8) manual page from infiniband-diags: https://manpages.debian.org/testing/infiniband-diags/ibping.8.en.html
- Local `nmcli --offline connection add` validation for the InfiniBand profile syntax.

## Issues Found
- The module loading example omitted `ib_umad`, which is needed by InfiniBand management/diagnostic tools such as `ibping` and `sminfo`, and `rdma_ucm`, which supports userspace RDMA connection management. Added both modules to the example.
- The `ibping` comments implied that the server uses the LID, but the LID is used by the client target. Updated the comments and added `-c 50` to make the client example match documented bounded ping usage.
- The `systemctl enable --now rdma` command was misleading for persistent RDMA module configuration. Replaced it with the RHEL-documented `rdma-load-modules@rdma.service` restart command used after changing `/etc/rdma/modules/rdma.conf`.

## Review Notes
The guide remains a concise setup walkthrough. In a future revision, it could mention that RHEL 9 documentation describes OpenSM as limited and not actively developed upstream, and that switch-embedded subnet managers are commonly preferred in production fabrics.
