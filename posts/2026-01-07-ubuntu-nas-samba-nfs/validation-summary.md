# Validation Summary: How to Configure Ubuntu as a NAS with Samba and NFS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- Linux storage and filesystems
- mdadm software RAID
- OpenZFS
- Samba / SMB / CIFS
- NFS
- UFW
- Linux ACLs
- smartmontools
- systemd
- cron

## Sources Consulted
- Ubuntu Server documentation: Samba file server, https://ubuntu.com/server/docs/how-to/samba/file-server/
- Ubuntu Server documentation: Network File System, https://ubuntu.com/server/docs/how-to/networking/install-nfs/
- Samba `smb.conf(5)` manual, https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Linux `nfs.conf(5)` manual, https://man7.org/linux/man-pages/man5/nfs.conf.5.html
- Ubuntu `zfs-auto-snapshot(8)` manual, https://manpages.ubuntu.com/manpages/focal/man8/zfs-auto-snapshot.8.html
- Ubuntu `zed(8)` manual, https://manpages.ubuntu.com/manpages/noble/man8/zed.8.html
- OpenZFS `zfsprops(7)` manual, https://openzfs.github.io/openzfs-docs/man/master/7/zfsprops.7.html
- Linux `mdadm.conf(5)` manual, https://man7.org/linux/man-pages/man5/mdadm.conf.5.html
- smartmontools project and `smartd.conf(5)` references, https://www.smartmontools.org/

## Issues Found
- The ZFS auto-snapshot example tried to enable a non-existent generic `zfs-auto-snapshot.timer`. Updated it to adjust the cron files installed by the Ubuntu/Debian `zfs-auto-snapshot` package.
- The NFS static-port and performance examples used legacy `/etc/default/nfs-kernel-server` variables, which are not the primary configuration mechanism for Ubuntu 22.04 and newer. Updated them to use `/etc/nfs.conf.d/*.conf` with INI-style `nfs.conf` sections.
- The Samba performance and network-restriction snippets wrote separate files but did not make Samba read them. Added `include` insertion commands while keeping those settings in the `[global]` section, then validating and reloading Samba.
- The mdadm alert example overwrote `/etc/mdadm/mdadm.conf`, which could remove the previously saved `ARRAY` definition. Changed it to append the alert settings instead.
- The ZFS event daemon commands used `zed` as the service name. Updated them to install and manage Ubuntu's `zfs-zed` service.
- Several client mount examples assumed mount points already existed. Added `mkdir -p` commands for Linux CIFS, Linux NFS, macOS NFS, and the local NFS troubleshooting mount.
- The Samba audit example would replace the existing VFS module list for the audited share. Updated the example to keep `fruit streams_xattr` when adding `full_audit`.
- The security update script used `apt upgrade` with package names for targeted upgrades. Updated it to use `apt install --only-upgrade`.

## Review Notes
The tutorial is technically relevant and broadly accurate after the corrections. Some performance tuning values, especially Samba socket options and system-level sysctl settings, should still be benchmarked before production use because official Samba documentation cautions that low-level socket tuning can reduce performance when applied blindly.
