# Validation Summary: How to Migrate from Standalone VDO to LVM-VDO on RHEL

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Red Hat Enterprise Linux
- VDO
- LVM-VDO
- LVM2
- XFS
- `/etc/fstab`

## Sources Consulted
- Red Hat Enterprise Linux 8 documentation: Importing existing VDO volumes to LVM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/deduplicating_and_compressing_logical_volumes_on_rhel/proc_importing-existing-vdo-volumes-to-lvm_deduplicating-and-compressing-logical-volumes-on-rhel
- Red Hat Enterprise Linux 8 documentation: Deduplicating and compressing logical volumes on RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html-single/deduplicating_and_compressing_logical_volumes_on_rhel/index
- Red Hat Enterprise Linux 9 documentation: Deduplicating and compressing logical volumes on RHEL: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/deduplicating_and_compressing_logical_volumes_on_rhel
- Red Hat Enterprise Linux 8 documentation: Maintaining standalone VDO volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/deduplicating_and_compressing_storage/maintaining-vdo_deduplicating-and-compressing-storage
- `lvm_import_vdo(8)` upstream man page: https://man7.org/linux/man-pages/man8/lvm_import_vdo.8.html
- LVM2 report field reference source showing `vdo_saving_percent`: https://fossies.org/linux/LVM2/lib/report/columns.h

## Issues Found
- The post said the conversion "converts in place without data loss." The command preserves data, but `lvm_import_vdo` is explicitly irreversible, and the upstream man page distinguishes normal conversion from direct in-place manipulation with `--no-snapshot`. Changed the wording to "preserves data, but the conversion is not reversible."
- The post said standalone VDO commands are "no longer needed" after migration. Red Hat documents that the VDO manager no longer controls the converted volume, so the wording was narrowed to say those commands no longer manage the converted volume.

## Review Notes
The migration command, `lvs` verification commands, `/etc/fstab` device path update, and XFS growth example are consistent with Red Hat and LVM documentation. Operators should still validate the actual source device name from `vdo status` before running `lvm_import_vdo`, and should keep backups because the import operation is not reversible.
