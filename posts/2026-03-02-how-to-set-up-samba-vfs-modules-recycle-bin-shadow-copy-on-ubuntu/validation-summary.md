# Validation Summary: How to Set Up Samba VFS Modules (Recycle Bin, Shadow Copy) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Samba (smbd, smb.conf)
- Samba VFS modules: `recycle`, `shadow_copy2`, `full_audit`
- LVM (lvcreate, lvremove, lvs, snapshots)
- Linux filesystem permissions (chown, chmod)
- cron / crontab
- systemd (systemctl reload smbd)
- testparm and smbcontrol
- Windows "Previous Versions" client integration

## Sources Consulted
- Samba `vfs_recycle(8)` man page: https://www.samba.org/samba/docs/current/man-html/vfs_recycle.8.html
- Samba `vfs_shadow_copy2(8)` man page: https://www.samba.org/samba/docs/current/man-html/vfs_shadow_copy2.8.html
- Samba `vfs_full_audit(8)` man page: https://www.samba.org/samba/docs/current/man-html/vfs_full_audit.8.html
- Samba `smb.conf(5)` man page: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- LVM `lvcreate(8)` and `lvm(8)` man pages (volume naming rules)
- `smbcontrol(1)` man page (debuglevel command)
- syslog(3) facility names (LOCAL0–LOCAL7)

## Issues Found
- **LVM logical volume name contained an invalid `@` character.** The original snapshot examples used `SNAP_NAME=$(date -u +@GMT-%Y.%m.%d-%H.%M.%S)` and passed that name to `lvcreate --name`. LVM volume names are restricted to `a-z A-Z 0-9 + _ . -` per `lvm(8)`, so `@` causes `lvcreate` to reject the name. Fixed both the inline example and the `samba-snapshot.sh` script to use a sanitized LV name (`snap-YYYY_MM_DD-HH_MM_SS`) for the LVM object while keeping the mount-point directory in the `@GMT-YYYY.MM.DD-HH.MM.SS` format that `shadow_copy2` requires. The cleanup logic was also updated to derive the old LV name from the old mount directory name so `lvremove` continues to work.

## Review Notes
- Recycle module parameters (`recycle:repository`, `recycle:keeptree`, `recycle:versions`, `recycle:touch`, `recycle:maxsize`, `recycle:exclude`, `recycle:exclude_dir`) all match the names documented in `vfs_recycle(8)`.
- shadow_copy2 parameters (`shadow:snapdir`, `shadow:format`, `shadow:sort`, `shadow:localtime`) match `vfs_shadow_copy2(8)`. The default `@GMT-YYYY.MM.DD-HH.MM.SS` format and the `desc`/`asc` sort values are correct.
- full_audit parameters (`success`, `failure`, `prefix`, `priority`, `facility`) and the `%u|%I` substitution variables are valid; `LOCAL5` is a valid syslog facility.
- `testparm`, `smbcontrol smbd debuglevel 3`, and `systemctl reload smbd` are all correct usages for Ubuntu's Samba packaging.
- Operationally, LVM snapshots can fill up if write activity to the origin exceeds the snapshot size; the post's fixed snapshot size of 1G–2G may be undersized for busy shares. Consider thin-provisioned snapshots or a sizing note in a future revision.
- Stacking order in `vfs objects = shadow_copy2 recycle full_audit` is reasonable: shadow_copy2 should generally be listed first so it intercepts path resolution before other modules act, which matches Samba's documented guidance.
