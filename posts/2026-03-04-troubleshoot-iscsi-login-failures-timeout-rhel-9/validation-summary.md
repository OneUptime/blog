# Validation Summary: How to Troubleshoot iSCSI Login Failures and Timeout Issues on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- iSCSI initiator tools (`iscsiadm`, `iscsid`, `/etc/iscsi/iscsid.conf`)
- iSCSI target configuration (`targetcli`, `target.service`)
- CHAP authentication
- SELinux troubleshooting
- Linux networking and firewall diagnostics

## Sources Consulted
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 6: Configuring an iSCSI target: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-target_managing-storage-devices
- Red Hat Enterprise Linux 9 Managing storage devices, Chapter 7: Configuring an iSCSI initiator: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_storage_devices/configuring-an-iscsi-initiator_managing-storage-devices
- Red Hat Enterprise Linux 9 Using SELinux: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux
- `iscsiadm(8)` man page for iscsi-initiator-utils: https://www.mankier.com/8/iscsiadm
- `targetcli(8)` man page: https://www.mankier.com/8/targetcli
- open-iscsi sample `iscsid.conf` timeout settings: https://sources.debian.org/src/open-iscsi/2.0.873%2Bgit0.3b4b4500-8/etc/iscsid.conf

## Issues Found
- The post described `iscsiadm -m session -r <session_id> --rescan` as forcing session recovery. The `iscsiadm(8)` documentation states that `--rescan` rescans a specific session when a SID is provided, or all running sessions when no SID is provided. I changed the section heading and command comment to describe this as a session rescan and changed `<session_id>` to `<sid>`, matching the documented term.
- The SELinux section recommended `setsebool -P iscsi_use_fusefs on`. I could not verify `iscsi_use_fusefs` as a RHEL 9 iSCSI boolean, and Red Hat's SELinux guidance recommends checking AVC-related audit events and identifying relevant booleans with `semanage boolean -l`. I replaced the hard-coded boolean with commands to query SELinux denials, list iSCSI-related booleans, and enable only a relevant boolean matching the denial.

## Review Notes
The remaining iSCSI discovery, login, CHAP, `targetcli`, session inspection, timeout, journal, firewall, and network diagnostic commands are consistent with RHEL 9 storage documentation, the `iscsiadm(8)` interface, and standard Linux troubleshooting practice. The timeout values are valid open-iscsi configuration keys; in environments using DM Multipath, Red Hat documents that multipath settings such as `fast_io_fail_tmo` can override iSCSI replacement timeout behavior.
