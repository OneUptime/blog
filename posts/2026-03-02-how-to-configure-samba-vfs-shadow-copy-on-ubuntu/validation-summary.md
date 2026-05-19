# Validation Summary: How to Configure Samba VFS Shadow Copy on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Samba `vfs_shadow_copy2`
- SMB Previous Versions / shadow copies
- LVM snapshots
- Btrfs snapshots
- cron
- systemd timers
- Windows Previous Versions

## Sources Consulted
- Samba `vfs_shadow_copy2` manual: https://www.samba.org/samba/samba/docs/man/manpages/vfs_shadow_copy2.8.html
- Samba `testparm` manual: https://www.samba.org/samba/samba/docs/man/manpages/testparm.1.html
- Samba `smbclient` manual: https://www.samba.org/samba/samba/docs/man/manpages/smbclient.1.html
- LVM `lvcreate` manual: https://man.archlinux.org/man/lvcreate.8.en
- Btrfs `btrfs-subvolume` manual: https://btrfs.readthedocs.io/en/latest/btrfs-subvolume.html
- Btrfs manual / snapshot definition: https://btrfs.readthedocs.io/en/latest/btrfs-man5.html
- Microsoft `Win32_ShadowCopy` class documentation: https://learn.microsoft.com/en-us/previous-versions/windows/desktop/vsswmi/win32-shadowcopy
- systemd timer manual: https://www.freedesktop.org/software/systemd/man/249/systemd.timer.html

## Issues Found
- The LVM snapshot creation script used `/srv/samba/.snapshots`, while the Samba configuration and troubleshooting commands used `/srv/samba/data/.snapshots`. Updated the creation script to use `/srv/samba/data/.snapshots` so snapshots are created where `shadow:snapdir = .snapshots` under `shadow:basedir = /srv/samba/data` expects them.
- The LVM cleanup script used the same incorrect `/srv/samba/.snapshots` path. Updated it to `/srv/samba/data/.snapshots` so pruning removes the snapshots created by the guide.
- The directory setup comment said `shadow_copy2` would look in `.snapshots` "by default." Updated the wording because the guide makes Samba look there through the explicit `shadow:snapdir = .snapshots` setting.
- The `shadow:localtime` comment incorrectly described path presentation inside snapshots. Updated it to explain that `shadow:localtime = no` matches UTC/GMT snapshot names produced with `date -u`.
- The Btrfs snapshot example created `/srv/samba/.snapshots` while the Samba configuration expected `/srv/samba/data/.snapshots`. Updated the Btrfs example to use `/srv/samba/data/.snapshots`.
- The PowerShell `Get-WmiObject Win32_ShadowCopy` example was inaccurate for validating Samba `shadow_copy2` snapshots on a network share because `Win32_ShadowCopy` represents Windows VSS shadow copies. Replaced it with a note to use Windows Explorer for the client-side Previous Versions check and Linux-side Samba checks for configuration validation.
- The post referred to a `vfs_shadow_copy2` test mode, but the shown command was `testparm`. Updated the wording to say there is no separate `vfs_shadow_copy2` test mode and that `testparm` inspects parsed share configuration.

## Review Notes
The guide is technically valid after the fixes. Snapshot sizing remains workload-dependent; the 1GB LVM COW size is only an example and should be adjusted based on write volume.
