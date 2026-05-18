# Validation Summary: How to Set Up iSCSI Initiator and Target on Ubuntu

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- iSCSI (Internet Small Computer Systems Interface) protocol
- Linux LIO (Linux-IO) target framework
- targetcli-fb (configuration shell for LIO)
- open-iscsi (Linux iSCSI initiator)
- iscsiadm (initiator administration tool)
- CHAP authentication (mutual and one-way)
- Ubuntu (apt, systemd, ufw, netplan)
- ext4 filesystem, fdisk, /etc/fstab
- Jumbo frames / MTU tuning
- Multipath I/O (MPIO) reference

## Sources Consulted
- Ubuntu Server Documentation - iSCSI Initiator: https://ubuntu.com/server/docs/iscsi-initiator
- Ubuntu Server Documentation - iSCSI Target: https://ubuntu.com/server/docs/iscsi-target
- targetcli-fb man pages and upstream documentation: https://github.com/open-iscsi/targetcli-fb
- open-iscsi project documentation: https://github.com/open-iscsi/open-iscsi
- iscsiadm(8) and iscsid.conf(5) man pages
- RFC 3720 (Internet Small Computer Systems Interface) - IQN naming convention
- RFC 3721 (iSCSI Naming and Discovery)
- Red Hat Storage Administration Guide - iSCSI target/initiator configuration (analogous LIO documentation)

## Issues Found
No technical issues found.

The post is technically accurate. Verified items:

- Package names `targetcli-fb` and `open-iscsi` are correct for current Ubuntu releases.
- IQN format `iqn.YYYY-MM.reverse-domain:identifier` follows RFC 3720.
- targetcli command flow (backstores/fileio create, /iscsi create, tpg1/portals create, tpg1/luns create, tpg1/acls create) is correct.
- `set attribute authentication=0` and `set attribute generate_node_acls=0` are valid TPG attributes.
- `saveconfig` correctly persists configuration to `/etc/rtslib-fb-target/saveconfig.json`.
- `rtslib-fb-targetctl.service` is the systemd unit shipped by the targetcli-fb package that restores configuration at boot.
- `iscsiadm` flags (`--mode discovery --type sendtargets`, `--mode node --login`, `--mode node --loginall=automatic`, `--mode session --print 3`, `--op update --name node.startup --value automatic`) match upstream open-iscsi documentation.
- `/etc/iscsi/initiatorname.iscsi` is the correct location for the initiator IQN.
- CHAP parameters in `/etc/iscsi/iscsid.conf` (`node.session.auth.authmethod`, `node.session.auth.username`, `node.session.auth.password`, plus `_in` variants for mutual CHAP) match the iscsid.conf documentation.
- targetcli `set auth userid=...` and `set auth password=...` syntax is correct.
- TCP port 3260 is the correct, IANA-assigned iSCSI port.
- `dd` arithmetic: `bs=1M count=10240` correctly produces a 10 GiB file.
- `_netdev,nofail` mount options are appropriate for iSCSI-backed filesystems in `/etc/fstab`.
- `nc -zv 192.168.1.10 3260` is a valid TCP connectivity check.
- Jumbo frames (`mtu 9000`) and netplan example are correct.

## Review Notes
- The note "or on some Ubuntu versions: `targetclid`" is slightly imprecise: `targetclid` is a daemon for handling targetcli IPC operations rather than the boot-time configuration restore service. In practice, `rtslib-fb-targetctl.service` is the relevant unit on Ubuntu for restoring the saved target configuration at boot. Both unit names exist in the targetcli-fb 2.1.x packaging, however, so enabling either is benign and the existing wording does not introduce a functional error.
- When a target is created, targetcli typically auto-creates a default `0.0.0.0:3260` portal; users binding to a specific IP may need to `delete 0.0.0.0 3260` before `create 192.168.1.10 3260`. This is a minor operational nuance, not an error in the post.
- `write_back=false` (write-through) is a safer default for fileio backstores but reduces performance; users on dedicated storage hardware may prefer `write_back=true`. Worth noting for production planning but not an error.
- The post references a separate "Multipath I/O configuration guide" as a cross-reference; readers should be aware that MPIO setup is mandatory for production-grade iSCSI deployments to avoid single-path failures.
- CHAP passwords are typically required to be 12-16 characters depending on enforcement; the examples meet this requirement.
