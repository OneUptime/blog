# Validation Summary: How to Configure an iSCSI Target with targetcli on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- iSCSI
- targetcli
- Linux-IO (LIO) kernel target subsystem
- firewalld
- systemd

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Configuring an iSCSI target - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-target_managing-storage-devices
- RFC 3720: Internet Small Computer Systems Interface (iSCSI), IQN format - https://datatracker.ietf.org/doc/html/rfc3720
- targetcli(8) manual page - https://www.mankier.com/8/targetcli
- targetctl(8) manual page - https://www.mankier.com/8/targetctl

## Issues Found
- The example target and initiator IQNs used `iqn.2024.com.example...`, which is not a valid IQN format because IQNs require a `yyyy-mm` date code. Changed the examples to `iqn.2024-03.com.example...`.
- The LUN concept described a LUN as a block device. Updated it to describe a LUN as a numbered logical unit exported through the target.
- The TPG concept described a TPG only as an IP and port endpoint. Updated it to reflect that a TPG groups portals, LUNs, and access controls.
- The LUN creation step always referenced the block backstore even though the post also shows a file-backed store. Added a note to use `/backstores/fileio/disk0` for the file-backed option.
- The persistence section said the `target` service automatically saves and restores configuration. Updated it to say that `saveconfig` saves the configuration so the `target` service can restore it at boot.

## Review Notes
The core RHEL 9 workflow is correct: install `targetcli`, start and enable the `target` service, create a backstore, create an iSCSI target, add a LUN, configure an ACL, create or adjust a portal, open TCP port 3260, and inspect `/etc/target/saveconfig.json`. For production, the post correctly notes CHAP authentication and multipathing as follow-up considerations.
