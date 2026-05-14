# Validation Summary: How to Size and Provision VDO Volumes for Object Storage on RHEL 9

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LVM-VDO / Virtual Data Optimizer
- XFS
- LVM commands (`pvcreate`, `vgcreate`, `lvcreate`, `lvchange`, `lvextend`, `lvs`)
- VDO monitoring (`vdostats`)
- Object storage workloads, including MinIO, OpenStack Swift, and Ceph caveats

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- Red Hat Enterprise Linux 9 documentation: Considerations in adopting RHEL 9 - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/considerations_in_adopting_rhel_9/assembly_kernel_considerations-in-adopting-rhel-9
- Linux kernel documentation: dm-vdo - https://docs.kernel.org/admin-guide/device-mapper/vdo.html

## Issues Found
- The post listed only `lvm2` and `kmod-kvdo` as required packages. Red Hat's RHEL 9 VDO installation procedure installs `lvm2`, `kmod-kvdo`, and `vdo`, so the prerequisite was corrected.
- The opening text and Ceph OSD example implied Ceph Storage can be deployed on LVM-VDO. Red Hat explicitly lists deploying Ceph Storage on LVM-VDO as unsupported, so the Ceph command was replaced with an unsupported-configuration warning.
- The main object storage example provisioned a 5:1 logical-to-physical ratio. Red Hat's RHEL web console guidance uses 3:1 for object storage, so the general object-storage example was changed from 10 TB virtual on 2 TB physical to 6 TB virtual on 2 TB physical. The higher-ratio backup-target example remains workload-specific.
- The UDS memory explanation incorrectly described dense and sparse index RAM as a direct function of physical storage size. Red Hat and kernel documentation size UDS RAM by deduplication window, with a 250 MB minimum/default for UDS. The memory section and sizing table heading were corrected.
- The mount example used continuous online `discard`. Red Hat documents `discard` as available but recommends `fstrim` instead because of the potential performance impact. The mount and `/etc/fstab` examples now use defaults and enable `fstrim.timer`.
- The block map cache tuning command omitted the required restart of the LVM-VDO device for the setting to take effect. The example now unmounts, deactivates, changes the setting, reactivates, and remounts.
- The thread-count tuning example also needed to account for VDO settings taking effect after the device is restarted. The example now includes unmount, deactivate, activate, and remount steps.
- The write-policy section recommended changing between `async` and `sync`. RHEL 9 removed multiple VDO write policies and uses `async` exclusively, so the invalid commands were replaced with a RHEL 9-specific note.
- The physical-capacity growth example extended the visible VDO LV. Red Hat's LVM-VDO recovery/growth procedure extends the VDO pool LV for physical space, so the command was corrected to extend `vg_objstore/vpool0`.

## Review Notes
The post is technically relevant and has been corrected for RHEL 9's LVM-VDO behavior. Future improvements could add a short note that VDO pool names such as `vpool0` should be confirmed with `lvs` before extending physical capacity, especially on systems with multiple VDO volumes.
