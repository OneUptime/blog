# Validation Summary: How to Configure VMXNET3 and PVSCSI Drivers for RHEL in VMware

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- VMware vSphere
- VMXNET3
- VMware Paravirtual SCSI (PVSCSI)
- NetworkManager
- ethtool
- dracut and lsinitrd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring ethtool settings in NetworkManager connection profiles, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-ethtool-settings-in-networkmanager-connection-profiles_configuring-and-managing-networking
- Broadcom VMware KB 343323: Large-scale workloads with intensive I/O patterns might require queue depths significantly greater than Paravirtual SCSI default values, https://knowledge.broadcom.com/external/article?legacyId=2053145
- Broadcom VMware KB 390837: Red Hat Enterprise Linux VM fails to boot after changing its SCSI controller to VMware Paravirtual, https://knowledge.broadcom.com/external/article/390837/red-hat-enterprise-linux-rhel-vm-fails-t.html
- Broadcom VMware KB 322369: RSS and multiqueue support in Linux driver for VMXNET3, https://knowledge.broadcom.com/external/article?legacyId=2020567
- dracut(8) manual page, https://man7.org/linux/man-pages/man8/dracut.8.html
- Linux kernel vmw_pvscsi driver source, https://kernel.googlesource.com/pub/scm/linux/kernel/git/stable/linux-stable/+/8d09617b076fd03ee9ae124abce94dda17bf3723/drivers/scsi/vmw_pvscsi.c

## Issues Found
- The post said VMXNET3 and PVSCSI should be used for all production VMware VMs. This was too absolute, because PVSCSI queue and controller choices are most relevant for I/O-intensive workloads. Changed the wording to "good defaults for most production VMware VMs, especially I/O-intensive workloads."
- The NetworkManager persistence example used `ens192` as the connection name. NetworkManager modifies connection profiles, and profile names do not always match interface names. Added `nmcli connection show` and changed the command to use an example profile name.
- The VMXNET3 ring-buffer example set `4096` without checking supported maximums. Added `ethtool -g ens192` before the change so the maximum supported RX/TX ring values can be verified.
- The PVSCSI queue-depth example set `cmd_per_lun=64`, which is the documented default value and therefore not an increase. Changed the tuning example to use the documented higher values `cmd_per_lun=254` and `ring_pages=32`, including the persistent modprobe configuration.

## Review Notes
The commands are generally correct for modern RHEL on VMware, but interface names, NetworkManager profile names, supported VMXNET3 ring sizes, and storage device names such as `/dev/sda` vary by VM. Operators should verify these values on the target VM before applying the examples.
