# Validation Summary: How to Set Up an iSCSI Initiator and Discover Targets on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- iSCSI initiator
- iscsi-initiator-utils
- iscsiadm
- systemd services
- XFS file systems

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Configuring an iSCSI initiator": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-initiator_managing-storage-devices
- iscsiadm(8) man page for iscsi-initiator-utils: https://www.mankier.com/8/iscsiadm
- RFC 7143, "Internet Small Computer System Interface (iSCSI) Protocol (Consolidated)": https://www.rfc-editor.org/rfc/rfc7143

## Issues Found
- The example initiator and target IQNs used `iqn.2024.com.example:...`, which omits the required `yyyy-mm` date component for IQN names. Updated the examples to `iqn.2024-03.com.example:client1` and `iqn.2024-03.com.example:target1` throughout the post.

## Review Notes
The iSCSI discovery, login, logout, session inspection, service, and package commands align with the Red Hat Enterprise Linux 9 iSCSI initiator documentation and the iscsiadm man page. In production, persistent device naming and `_netdev` fstab entries are preferable to mounting raw `/dev/sdX` paths directly, but the examples are technically valid for a basic tutorial.
