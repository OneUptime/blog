# Validation Summary: How to Create LUNs and Map Them to iSCSI Targets on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- iSCSI
- targetcli
- Linux-IO (LIO) backstores
- LUN mapping and ACLs
- LVM logical volumes

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring an iSCSI target - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-target_managing-storage-devices
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- RFC 3720: Internet Small Computer Systems Interface (iSCSI), IQN format - https://www.rfc-editor.org/rfc/rfc3720.html
- targetcli-fb source documentation for mapped LUN command behavior - https://sources.debian.org/src/targetcli-fb/1%3A2.1.53-1/targetcli/ui_target.py/
- targetcli(8) man page - https://manpages.debian.org/testing/targetcli-fb/targetcli.8.en.html

## Issues Found
- The sample IQNs used `iqn.2024.com.example:...`, which omits the required month in the IQN date code. Updated all sample IQNs to `iqn.2024-03.com.example:...` so they follow the RFC 3720 `yyyy-mm` format used by iSCSI qualified names.
- The fileio examples created `lun0` and `lun1`, but later target and ACL examples referenced `/backstores/fileio/lun2`. Updated the fileio examples to create `lun2` and `lun3`, matching the later `/backstores/fileio/lun2` usage.
- The post said `write_back=false` pre-allocates fileio storage. Red Hat documents `write_back=false` as selecting write-through I/O instead of the write-back filesystem cache, while targetcli fileio files are sparse by default. Updated the wording to describe write-through behavior accurately.
- The ACL section tried to disable automatic mapping with `set attribute default_cmdsn_depth=64` and `set attribute generate_node_acls=0`. These do not disable automatic LUN-to-ACL mapping. Replaced them with the documented `set global auto_add_mapped_luns=false` setting.
- The mapped-LUN commands used `create mapped_lun0 /backstores/...` style syntax. Updated them to the documented `create mapped_lun=<number> tpg_lun_or_backstore=<backstore> [write_protect=1]` syntax.
- The read-only LUN example used the same shorthand mapped-LUN syntax and could be read as changing an existing mapping. Updated the wording and command to show creating a read-only mapped LUN with `write_protect=1`.

## Review Notes
- Red Hat recommends `write_back=false` for fileio storage objects to reduce data-loss risk, but the post still shows simple fileio examples without that option. Those commands remain valid; adding a production-safety note could be considered in a future editorial pass.
- The examples assume targetcli is installed and the target service/firewall have already been configured. That is outside this post's scope but is covered by Red Hat's targetcli setup documentation.
