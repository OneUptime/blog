# Validation Summary: How to Configure Persistent iSCSI Sessions Across Reboots on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- iSCSI initiator configuration
- open-iscsi / iscsiadm
- systemd services and mount units
- /etc/fstab network-backed mounts
- XFS file systems

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, "Configuring an iSCSI initiator": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-initiator_managing-storage-devices
- open-iscsi upstream README, iscsiadm usage and automatic startup settings: https://github.com/open-iscsi/open-iscsi
- open-iscsi upstream iscsid.conf defaults and timeout setting descriptions: https://raw.githubusercontent.com/open-iscsi/open-iscsi/master/etc/iscsid.conf
- systemd fstab generator documentation for _netdev handling: https://www.freedesktop.org/software/systemd/man/latest/systemd-fstab-generator.html
- systemd.mount unit documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.mount.html

## Issues Found
- The comment for `node.session.timeo.replacement_timeout` described it as the time to wait for a response before declaring a connection dead. Upstream open-iscsi documents it as the time to wait for session re-establishment before failing SCSI commands, so the comment was corrected.
- The comment for `node.conn[0].timeo.login_timeout` described it as a delay between login retries. Upstream open-iscsi documents it as the timeout for login completion; retry duration is controlled by this value together with `node.session.initial_login_retry_max`, so the comment was corrected.

## Review Notes
The commands and configuration names are current for RHEL 9's `iscsi-initiator-utils` workflow. Red Hat documents `_netdev` for automatically mounted iSCSI file systems, and upstream open-iscsi confirms that `node.startup = automatic` in `iscsid.conf` affects newly discovered nodes rather than existing node records.
