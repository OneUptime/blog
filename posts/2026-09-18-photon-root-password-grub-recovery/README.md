# How to Reset an Expired or Locked Photon OS Root Password from GRUB

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Photon OS, Security, System Administration

Description: Recover a Photon root account through a temporary GRUB edit while distinguishing password expiry, account locking, and PAM failure counters.

---

An expired password, a locked password entry, and a PAM failed-login counter are separate conditions. Changing the root password can solve one while leaving another in place. Recover through the console, inspect the actual account state, and reset only the mechanism that is preventing authorized access.

This guide applies to a standalone Photon system you administer. For a product appliance that embeds Photon, follow that product's recovery procedure because boot protection, account policy, and supported commands can differ.

## Prepare console access and recovery evidence

Schedule the required interruption and confirm you can reach the VM console directly through its host or management platform. If the affected VM also hosts your normal management service, arrange another management path before rebooting it.

Preserve a recoverable backup or an appropriate recovery point according to the workload's data-consistency requirements. Record the displayed login error: “password expired,” “account locked,” and “authentication failure” are useful distinctions.

If another authorized administrator can already obtain root privileges, use that working session to repair the account. GRUB recovery is for cases where normal administrative access is unavailable, and it requires rebooting the system.

## Enter the temporary recovery shell

The [Photon password-recovery guide](https://vmware.github.io/photon/docs-v5/troubleshooting-guide/solutions-to-common-problems/resetting-a-lost-root-password/) describes a temporary GRUB edit. Reboot, focus the console, and press `e` when the boot menu appears. If editing is protected, use your authorized GRUB credentials or the supported recovery path for that image.

Find the kernel command line beginning with `linux` or the equivalent entry for that boot configuration. Append:

```text
rw init=/bin/bash
```

Boot the edited entry with the key shown by GRUB, commonly F10. This changes the current boot only; do not make it a permanent bootloader configuration.

At the shell, verify root is writable:

```bash
mount | grep ' on / '
```

If it remains read-only, remount it writable with `mount -o remount,rw /` before changing account information. This minimal environment is not a normal systemd boot, so regular service-management commands may be unavailable or inappropriate.

## Reset the password and inspect aging

Set a new password interactively:

```bash
passwd root
```

Choose a password that meets the image's configured policy and store it through your normal secret-management process. Do not put the password in the command line, a shell script, or an incident ticket.

Where the installed account tools provide them, inspect:

```bash
passwd -S root
chage -l root
```

The upstream [passwd manual](https://github.com/shadow-maint/shadow/blob/master/man/passwd.1.xml) distinguishes password state, and the [chage manual](https://github.com/shadow-maint/shadow/blob/master/man/chage.1.xml) explains aging and account-expiration fields. Resetting a password normally updates its last-change date, but an account-expiration date or another policy restriction can still block access.

Correct an unintended expiration according to the approved account policy. Do not disable aging globally just to finish recovery. If the password remains explicitly locked after setting a valid password, inspect why it was locked before using an unlock operation.

## Reset the configured failed-login mechanism

Photon's historical recovery documentation mentions `pam_tally2`, but available tools and PAM configuration vary by release and image hardening. Inspect the active configuration before choosing a command:

```bash
grep -R -E 'pam_tally2|pam_faillock' /etc/pam.d
command -v pam_tally2
command -v faillock
```

If the configured mechanism is `pam_tally2` and the tool exists, its documented reset is:

```bash
pam_tally2 --reset --user root
```

If the PAM stack uses `pam_faillock`, inspect and reset that mechanism instead:

```bash
faillock --user root
faillock --user root --reset
```

The [Linux-PAM faillock reference](https://github.com/linux-pam/linux-pam/blob/master/modules/pam_faillock/faillock.8.xml) documents the per-user records. If your policy stores them in a custom directory, use that configured location. Running an unrelated reset command does not clear the lockout mechanism actually used by login.

## Reboot cleanly and validate access

After successful changes, flush pending writes. Photon documents unmounting root and forcing a reboot from this minimal shell:

```bash
sync
umount /
reboot -f
```

If unmounting fails, investigate the mount state and use the image's supported recovery instructions rather than assuming writes reached disk. Do not start normal applications in the recovery shell.

Log in through the console first, then test your intended remote administration method. Successful console authentication does not imply that SSH permits root login, and recovery should not automatically broaden SSH policy.

Finally investigate what triggered lockout or expiry. Update stale automation credentials, check failed-login sources, verify the password-aging schedule, and test the documented emergency-access procedure. Recovery is complete when legitimate access works and the cause will not immediately lock the account again.
