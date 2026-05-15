# Validation Summary: How to Destroy and Clean Up Stratis File Systems and Pools on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Stratis storage management
- stratis-cli and stratisd
- XFS filesystems
- /etc/fstab systemd mount options
- Linux storage utilities: umount, findmnt, wipefs, blkid, dmsetup

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Removing Stratis file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/managing_file_systems/setting-up-stratis-file-systems_managing-file-systems
- Red Hat Enterprise Linux 9 documentation, "Setting up non-root Stratis file systems in /etc/fstab using a systemd service": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/managing_file_systems/setting-up-stratis-file-systems_managing-file-systems
- Stratis upstream how-to, pool and filesystem destroy operations: https://stratis-storage.github.io/howto/
- Stratis 3.8.1 release notes, fstab setup service guidance: https://stratis-storage.github.io/
- Local system man pages for umount(8), findmnt(8), wipefs(8), and dmsetup(8)

## Issues Found
- The `umount -l` example was described as a force unmount. `-l` is a lazy unmount, while `umount -f` is the force option. Updated the wording to "lazy unmount."
- The `/etc/fstab` example used `x-systemd.requires=stratisd.service`. RHEL 9 documents Stratis fstab entries using `/dev/stratis/...` and `stratis-fstab-setup@pool-uuid.service` with a matching `x-systemd.after` option. Updated the example line accordingly.
- The cleanup script used `stratis filesystem list "$POOL" --no-headers`, but the documented Stratis CLI syntax for `filesystem list` does not include `--no-headers`. Replaced it with an `awk 'NR > 1 {print $2}'` filter over the documented list output.
- The script called `findmnt` with a bare device argument. The findmnt man page notes that bare arguments can be interpreted as a source or target, so the script now uses `--source "$device"` explicitly.
- The partially failed pool cleanup used `dmsetup remove_all --force`, which attempts to remove all device-mapper definitions, not just Stratis devices. Replaced it with a command that removes only entries whose names include `stratis`.

## Review Notes
The main Stratis destruction sequence is consistent with Red Hat's RHEL 9 documentation: unmount Stratis filesystems, destroy filesystems, then destroy the pool. The post's failed-pool recovery section remains an advanced, destructive recovery path and should be used only after confirming the target devices are no longer needed.
