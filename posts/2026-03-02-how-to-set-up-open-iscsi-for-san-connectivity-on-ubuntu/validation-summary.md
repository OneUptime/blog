# Validation Summary: How to Set Up Open-iSCSI for SAN Connectivity on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- open-iscsi (initiator daemon and tools, package version 2.1.x in Ubuntu 22.04/24.04)
- iscsid (iSCSI daemon) and systemd unit management
- iscsiadm (CLI for discovery, login, session management, node configuration)
- iSCSI Qualified Name (IQN) format (RFC 3720)
- SendTargets and iSNS discovery
- CHAP and mutual CHAP authentication
- parted, mkfs.xfs, blkid, lsblk for block device handling
- /etc/fstab with `_netdev` and `nofail` for persistent network-attached mounts
- multipath-tools (mentioned)
- Ubuntu (apt, systemctl)

## Sources Consulted
- Upstream open-iscsi iscsid.conf (https://raw.githubusercontent.com/open-iscsi/open-iscsi/master/etc/iscsid.conf)
- Upstream open-iscsi repository (https://github.com/open-iscsi/open-iscsi)
- Ubuntu iscsiadm(8) manpage (https://manpages.ubuntu.com/manpages/jammy/man8/iscsiadm.8.html)
- Ubuntu open-iscsi package metadata (https://packages.ubuntu.com/jammy/open-iscsi)
- Ubuntu Server iSCSI initiator documentation (https://documentation.ubuntu.com/server/how-to/storage/iscsi-initiator-or-client/)
- Red Hat iSCSI discovery configuration reference (https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/storage_administration_guide/iscsi-config)
- RFC 3720 (iSCSI protocol)

## Issues Found
- **Misleading comment in iscsid.conf snippet.** The line `# Error recovery level (0=session, 1=digest, 2=conn)` preceded the `node.session.err_timeo.*` block, but those settings are SCSI-layer error-recovery timeouts, not the iSCSI Error Recovery Level (ERL). ERL is a separate parameter (`node.session.iscsi.ERL`) and is not present in the snippet. The comment conflated two unrelated concepts. Replaced with `# SCSI error recovery timeouts (seconds)` to accurately describe the following settings.

## Review Notes
- Verified that both `iscsid.service` and `open-iscsi.service` exist as separate units in the Ubuntu open-iscsi package, so the `systemctl enable --now` calls for both are correct.
- Verified all iscsid.conf parameter names against upstream, including the unusual but correct spelling `discovery.isns.discoveryd_poll_inval` (with "inval", not "interval").
- Verified all CHAP parameter names (`node.session.auth.authmethod`, `username`, `password`, `username_in`, `password_in`) match upstream conventions.
- All iscsiadm subcommands, flags (`--loginall=all|automatic`, `--print 3`, `--rescan`, `--op update --name --value`, `--op delete`, `--op show`), and discovery types (`sendtargets`, `isns`) are correct.
- Default values cited (replacement_timeout=120, login_timeout=15, lu_reset_timeout=30) match the upstream default iscsid.conf.
- Minor stylistic note (not corrected, not an error): the `parted ... mkpart primary ext4 0% 100%` command uses `ext4` as the partition-type hint while the filesystem is later created with `mkfs.xfs`. This is harmless because parted's fs-type argument is only a hint stored in the partition table and does not affect the actual filesystem; many tutorials follow this convention.
- The IQN format description (`iqn.YYYY-MM.com.reversed-domain:optional-string`) is consistent with RFC 3720 §3.2.6.3.1.
- The portal group tag (PGT) explanation for the `,1` and `,2` suffix in SendTargets discovery output is accurate.
- `_netdev` and `nofail` fstab semantics described correctly for network-attached storage.
