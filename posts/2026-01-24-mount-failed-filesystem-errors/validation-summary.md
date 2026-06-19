# Validation Summary: How to Fix 'Mount Failed' File System Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Linux mount and umount commands
- /etc/fstab configuration
- ext4 and e2fsck
- XFS and xfs_repair
- Btrfs and btrfs check
- NFS mounts
- CIFS/SMB mounts
- LVM
- LUKS/dm-crypt
- systemd mount units

## Sources Consulted
- util-linux mount(8): https://man7.org/linux/man-pages/man8/mount.8.html
- util-linux fstab(5): https://man7.org/linux/man-pages/man5/fstab.5.html
- systemd.mount(5): https://man7.org/linux/man-pages/man5/systemd.mount.5.html
- Btrfs btrfs-check(8): https://man7.org/linux/man-pages/man8/btrfs-check.8.html
- Samba mount.cifs(8): https://www.samba.org/samba/docs/3.4/man-html/mount.cifs.8.html
- exfatprogs README: https://github.com/exfatprogs/exfatprogs
- Local Linux man pages for mount(8), fstab(5), and systemd.mount(5)
- Local apt package metadata for exfat-fuse and exfatprogs

## Issues Found
- The exFAT installation command used the obsolete `exfat-utils` package. Changed it to `exfatprogs`, which provides current exFAT filesystem utilities on modern Debian/Ubuntu systems, and kept `exfat-fuse` as an older-system fallback for systems without kernel exFAT support.
- The Btrfs corruption section recommended `btrfs check --repair` directly. Changed the guidance to run `btrfs check --readonly` first and only use `--repair` after backups and expert guidance, matching the Btrfs documentation's warning that repair mode can cause data loss.
- The Btrfs repair flowchart showed `btrfs check --repair` as the default Btrfs action. Changed it to `btrfs check --readonly`.
- The fstab format label used `<fsck>` for the sixth field. Changed it to `<pass>`, which matches the `fs_passno` field used by fsck to determine check order.
- The sample XFS fstab entry used pass value `2`. Changed it to `0`, since XFS is not checked by traditional boot-time fsck in the same way as ext filesystems.
- The CIFS credentials example used `chmod 600 /root/.smbcredentials` without sudo. Changed it to `sudo chmod 600 /root/.smbcredentials`, because files under `/root` require elevated permissions for a non-root shell.

## Review Notes
The remaining commands are generally valid for common Linux distributions, but several are intentionally administrative and potentially disruptive. In particular, filesystem repair tools should be run only on the correct unmounted device and after backups where possible.
