# Validation Summary: How to Configure iSCSI Storage for Network Block Devices on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- Linux iSCSI / Open-iSCSI
- Linux-IO (LIO) target framework
- targetcli-fb / rtslib-fb
- CHAP and mutual CHAP authentication
- Device Mapper Multipath / multipath-tools
- LVM, ext4, parted, UFW, sysctl

## Sources Consulted
- Ubuntu Server documentation: iSCSI initiator (or client): https://ubuntu.com/server/docs/how-to/storage/iscsi-initiator-or-client/
- Ubuntu Server documentation: Multipath configuration options and overview: https://ubuntu.com/server/docs/explanation/multipath/configuring-multipath/
- Ubuntu manpage: targetcli(8): https://manpages.ubuntu.com/manpages/focal/man8/targetcli.8.html
- Ubuntu manpage: iscsiadm(8): https://manpages.ubuntu.com/manpages/bionic/man8/iscsiadm.8.html
- Ubuntu manpage: multipath.conf(5): https://manpages.ubuntu.com/manpages/focal/man5/multipath.conf.5.html
- Open-iSCSI example iscsid.conf: https://github.com/open-iscsi/open-iscsi/blob/master/etc/iscsid.conf
- Open-iSCSI rtslib-fb project documentation: https://github.com/open-iscsi/rtslib-fb
- Red Hat Device Mapper Multipath documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/html/configuring_device_mapper_multipath/modifying-the-dm-multipath-configuration-file_configuring-device-mapper-multipath

## Issues Found
- The introduction described iSCSI as a "transport layer protocol." Changed this to "IP-based storage networking protocol" to match Ubuntu's description of iSCSI as an IP-based storage networking standard carrying SCSI commands over TCP/IP.
- The `iscsiadm` CHAP password examples used passwords ending in `!` without shell quoting. Quoted those values so the examples are safe in interactive shells where history expansion may be enabled.
- The sysctl tuning block mixed raw sysctl configuration lines and an executable `sudo sysctl -p` command in the same snippet, which could lead readers to paste a command into `/etc/sysctl.conf`. Reworked it to write `/etc/sysctl.d/99-iscsi-tuning.conf` with a heredoc and apply it with `sudo sysctl --system`.
- The security best-practice text said mutual CHAP "prevents man-in-the-middle attacks." Changed this to say it helps initiators verify target identity, and clarified that IPsec provides encryption and stronger protection over untrusted networks.

## Review Notes
The targetcli, open-iscsi, CHAP, and multipath command patterns are broadly consistent with Ubuntu documentation and upstream Open-Iscsi examples. Future improvements could add a stronger caveat that multipath configuration should be validated with `multipath -t` and adjusted for the storage vendor or environment before production use.
