# Validation Summary: How to Use iSCSI Multipathing for Redundancy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- iSCSI
- targetcli
- iscsiadm
- DM-Multipath
- multipath.conf
- XFS mounts and /etc/fstab

## Sources Consulted
- Red Hat Enterprise Linux 9: Configuring device mapper multipath: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_device_mapper_multipath/index
- Red Hat Enterprise Linux 9: Configuring an iSCSI initiator: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-initiator_managing-storage-devices
- Red Hat Enterprise Linux 9: Configuring an iSCSI target: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-target_managing-storage-devices
- Red Hat Enterprise Linux 7 Storage Administration Guide, iSCSI interface binding and target portal syntax reference: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/iscsi-offload-config and https://docs.redhat.com/en/documentation/red_hat_enterprise_Linux/7/html/storage_administration_guide/online-storage-management

## Issues Found
- The targetcli portal deletion example used `delete 0.0.0.0 3260`. Red Hat's documented syntax for removing the default portal uses named parameters, so the command was changed to `delete ip_address=0.0.0.0 ip_port=3260` and scoped with a comment that it applies only when the default portal exists.
- The `multipath.conf` example used `find_multipaths yes`. RHEL 9 documentation describes `on` as the default mode written by `mpathconf` and lists `on`, `off`, `greedy`, `smart`, and `strict` as the current values, so the snippet was changed to `find_multipaths on`.

## Review Notes
- The iSCSI iface, discovery, login, session verification, `mpathconf`, `multipath -ll`, XFS formatting, mounting, and `_netdev` fstab usage are technically consistent with the documented workflows.
- In production, stable aliases or WWID-based device paths are often preferable to relying on the generated `mpatha` name, but the article's example is valid with `user_friendly_names yes`.
