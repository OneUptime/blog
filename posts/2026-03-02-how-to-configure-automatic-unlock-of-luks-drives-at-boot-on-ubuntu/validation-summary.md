# Validation Summary: How to Configure Automatic Unlock of LUKS Drives at Boot on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- LUKS / dm-crypt
- cryptsetup
- /etc/crypttab
- /etc/fstab
- systemd-cryptsetup
- initramfs-tools

## Sources Consulted
- Ubuntu crypttab(5) man page: https://manpages.ubuntu.com/manpages/jammy/man5/crypttab.5.html
- Ubuntu cryptsetup-luksAddKey(8) man page: https://manpages.ubuntu.com/manpages/kinetic/man8/cryptsetup-luksAddKey.8.html
- Ubuntu cryptdisks_start(8) man page: https://manpages.ubuntu.com/manpages/jammy/man8/cryptdisks_start.8.html
- systemd-cryptsetup-generator(8) local man page
- systemd-cryptsetup@.service(8) local man page
- update-initramfs(8) local man page
- fstab(5) local man page from util-linux

## Issues Found
- The boot flow stated that initramfs reads `/etc/crypttab` and unlocks any listed LUKS volumes. This is not generally correct for ordinary non-root data volumes on modern Ubuntu systems, where systemd generates cryptsetup units from `/etc/crypttab`; initramfs handling applies to early-boot devices such as root, `/usr`, `/var`, or entries marked for initramfs processing. Updated the wording and Step 7 accordingly.
- The post said updating initramfs is required for the unlock configuration in all cases. For non-root data volumes this is not required; a systemd daemon reload is enough for pre-reboot testing, while initramfs should be rebuilt only for early-boot crypttab entries. Updated Step 7 to distinguish these cases.
- The removable-drive crypttab example used `nofail,noauto` under a heading for a drive that may not always be present. `noauto` disables automatic unlocking at boot, so it contradicts the automatic unlock example unless the intent is manual unlocking. Changed the example to `luks,nofail` and added a short note explaining when to add `noauto`.
- The troubleshooting command `cryptdisks_start --all` is not supported by the Ubuntu `cryptdisks_start` synopsis, which accepts a single mapping name. Replaced it with `cryptdisks_start data_drive`.
- The `luks` crypttab option was described as required. systemd can auto-detect LUKS devices when no mode is specified, though explicitly specifying `luks` remains valid and clear. Changed the description to "explicitly specifies LUKS format."

## Review Notes
The remaining commands and configuration examples are technically valid for the intended Ubuntu/LUKS data-volume workflow. The local environment did not have `cryptsetup` installed, so cryptsetup syntax was checked against Ubuntu man pages rather than local command output.
