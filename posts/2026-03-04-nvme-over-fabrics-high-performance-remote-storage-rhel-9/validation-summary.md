# Validation Summary: How to Configure NVMe over Fabrics for High-Performance Remote Storage on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NVMe over Fabrics
- NVMe/TCP
- NVMe/RDMA
- nvme-cli
- nvmf-autoconnect.service
- firewalld
- systemd
- XFS

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices: Configuring NVMe over fabrics using NVMe/TCP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-nvme-over-fabrics-using-nvme-tcp_managing-storage-devices
- Red Hat Enterprise Linux 9 Managing storage devices: Configuring NVMe over fabrics using NVMe/RDMA: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-nvme-over-fabrics-using-nvme-rdma_managing-storage-devices
- NVM Express specifications overview: https://nvmexpress.org/specifications/
- nvme-discover(1) man page: https://manpages.debian.org/unstable/nvme-cli/nvme-discover.1.en.html
- nvme-connect-all(1) man page: https://manpages.debian.org/unstable/nvme-cli/nvme-connect-all.1.en.html

## Issues Found
- The original target-side instructions configured the in-kernel `nvmet-tcp` controller module on RHEL 9. Red Hat's RHEL 9 storage documentation says the NVMe/TCP host is supported, but the `nvmet-tcp` controller module is not supported. I replaced those target setup commands with guidance to use a supported external NVMe/TCP controller, such as a storage array, appliance, SPDK-based target, or vendor-supported target software.
- The prerequisites originally required two RHEL servers and an NVMe drive on the target server. That implied a supported RHEL 9 NVMe/TCP target setup, so I changed the prerequisites to a RHEL 9 host plus a supported NVMe/TCP target/controller.
- The persistent connection example wrote `/etc/nvme/discovery.conf` and enabled `nvmf-autoconnect.service` without showing the `nvme connect-all` command used by the Red Hat procedure after adding discovery parameters. I added `sudo nvme connect-all` before enabling the autoconnect service.

## Review Notes
- The remaining `nvme discover`, `nvme connect`, `nvme list`, `nvme list-subsys`, `nvme disconnect`, and `nvme disconnect-all` command usage is consistent with nvme-cli documentation.
- The performance table is a representative comparison only. Real latency and throughput depend heavily on the storage controller, NICs, network configuration, MTU, kernel version, queue settings, CPU load, and workload profile.
