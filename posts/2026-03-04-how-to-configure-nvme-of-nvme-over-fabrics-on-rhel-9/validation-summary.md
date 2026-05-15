# Validation Summary: How to Configure NVMe-oF (NVMe over Fabrics) on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- NVMe over Fabrics
- NVMe/TCP
- Linux NVMe target (`nvmet`)
- `nvme-cli`
- `nvmetcli`
- `firewalld`
- `sysstat` / `iostat`

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices: Configuring NVMe over fabrics using NVMe/TCP: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-nvme-over-fabrics-using-nvme-tcp_managing-storage-devices
- Red Hat Enterprise Linux 9 Managing storage devices: Configuring NVMe over fabrics using NVMe/RDMA: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-nvme-over-fabrics-using-nvme-rdma_managing-storage-devices
- Linux kernel documentation: NVMe PCI Endpoint Function Target configfs example: https://docs.kernel.org/next/nvme/nvme-pci-endpoint-target.html
- `nvmetcli(8)` manual page: https://man.archlinux.org/man/nvmetcli.8.en
- `nvme-cli` upstream documentation and persistent configuration notes: https://github.com/linux-nvme/nvme-cli

## Issues Found
- The target package name was written as `nvmet-cli`, but the RHEL package is `nvmetcli`. Updated the install command.
- The post implied that configuring an NVMe/TCP target with `nvmet-tcp` is supported on RHEL 9. Red Hat documents NVMe/TCP host mode as supported and `nvmet-tcp` target mode as unsupported. Added a support-scope note before the target example.
- The subsystem name was a short label (`nvme-target1`) rather than an NVMe Qualified Name. Updated the subsystem and connect/disconnect examples to use `nqn.2026-03.com.example:nvme-target1`.
- The initiator steps did not load the `nvme-tcp` host module. Added `sudo modprobe nvme-tcp` before discovery.
- The persistent connection section only wrote `/etc/nvme/discovery.conf`. RHEL documentation also uses `nvme connect-all` and enables `nvmf-autoconnect.service` for persistent reconnection. Added both commands.
- The monitoring section used `nvme io-passthru` with a raw read opcode, which is not a performance-monitoring command and can fail without the required command fields. Replaced it with `iostat -x 1 /dev/nvme1n1` and added `sysstat` to the initiator package list.

## Review Notes
The target-side configfs example is useful for labs, but production RHEL 9 NVMe/TCP deployments should use a supported external or vendor NVMe/TCP target and treat RHEL 9 as the host/initiator.
