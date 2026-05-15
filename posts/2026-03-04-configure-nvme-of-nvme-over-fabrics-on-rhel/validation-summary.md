# Validation Summary: How to Configure NVMe-oF (NVMe over Fabrics) on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- NVMe over Fabrics
- NVMe/TCP
- NVMe/RDMA
- Linux NVMe target (`nvmet`)
- `nvme-cli`
- `nvmetcli`
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring NVMe over fabrics using NVMe/TCP": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-nvme-over-fabrics-using-nvme-tcp_managing-storage-devices
- Red Hat Enterprise Linux 10 documentation, "Configuring NVMe over fabrics using NVMe/TCP": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html/managing_storage_devices/configuring-nvme-over-fabrics-using-nvme-tcp
- Red Hat Enterprise Linux 9 documentation, "Configuring NVMe over fabrics using NVMe/RDMA": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-nvme-over-fabrics-using-nvme-rdma_managing-storage-devices
- Red Hat Enterprise Linux 8 documentation, "Configuring NVMe over fabrics using NVMe/RDMA": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/managing_storage_devices/configuring-nvme-over-fabrics-using-nvme-rdma_managing-storage-devices
- nvme-cli manual pages for `nvme discover`, `nvme connect`, and `nvme disconnect`: https://manpages.debian.org/unstable/nvme-cli/

## Issues Found
- The original post implied that RHEL supports both TCP and RDMA target configuration with the in-kernel `nvmet` target. Red Hat's current RHEL 9 and 10 NVMe/TCP documentation supports host mode and explicitly states that the NVMe/TCP controller module (`nvmet-tcp`) is not supported. The introduction and module-loading comment now clarify that `nvmet-tcp` is only suitable for lab systems where it is available, and that production TCP deployments should use a vendor-supported NVMe/TCP target.
- The namespace `device_path` write used a normal `echo`, while Red Hat's configfs examples use `echo -n` for the device path. Updated the command to avoid writing a trailing newline.
- The target transport address write also now uses `echo -n`, matching Red Hat's configfs examples for transport addresses.
- The persistence note only mentioned `/etc/nvme/discovery.conf`. Updated it to include `nvme connect-all` and enabling `nvmf-autoconnect.service`, matching the documented RHEL NVMe/TCP host workflow.

## Review Notes
The basic `nvme discover`, `nvme connect`, `nvme list`, and `nvme disconnect` command forms are consistent with documented `nvme-cli` usage. The example still uses permissive `attr_allow_any_host` for testing only, which is technically valid but should be tightened for production.
