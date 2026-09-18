# Validation Summary: How to Reset an Expired or Locked Photon OS Root Password from GRUB

## Status

validated

## Post Type

Technical recovery guide with shell commands and temporary kernel boot parameters.

## Technologies Covered

- Photon OS and console-based root account recovery
- GNU GRUB and Linux kernel boot parameters
- Bash and Linux filesystem administration
- shadow-utils password status and account aging
- Linux-PAM: pam_tally2, pam_faillock, and faillock
- OpenSSH root login policy

## Sources Consulted

- [Photon OS 5: Resetting a Lost Root Password](https://vmware.github.io/photon/docs-v5/troubleshooting-guide/solutions-to-common-problems/resetting-a-lost-root-password/) — console access, temporary GRUB edits, password reset, forced reboot, and legacy failed-login counter reset.
- [Linux kernel command-line parameters](https://www.kernel.org/doc/html/latest/admin-guide/kernel-parameters.html) — init and root filesystem boot parameters.
- [shadow-utils passwd manual](https://github.com/shadow-maint/shadow/blob/master/man/passwd.1.xml) — interactive password changes, status reporting, and password locking.
- [shadow-utils chage manual](https://github.com/shadow-maint/shadow/blob/master/man/chage.1.xml) — account aging, expiration, and list mode.
- [Linux-PAM 1.3.1 pam_tally2 manual](https://raw.githubusercontent.com/linux-pam/linux-pam/v1.3.1/modules/pam_tally2/pam_tally2.8.xml) — legacy reset syntax, default counter file, custom file selection, and root-specific lockout options.
- [Linux-PAM faillock manual](https://github.com/linux-pam/linux-pam/blob/master/modules/pam_faillock/faillock.8.xml) — per-user inspection and reset, configuration file, and counter directory selection.
- [Linux-PAM faillock.conf manual](https://raw.githubusercontent.com/linux-pam/linux-pam/master/modules/pam_faillock/faillock.conf.5.xml) — persistence and root lockout configuration.
- [Linux-PAM 1.5.0 release notes](https://raw.githubusercontent.com/linux-pam/linux-pam/v1.5.0/NEWS) — removal of deprecated pam_tally2 upstream.
- [util-linux mount manual](https://raw.githubusercontent.com/util-linux/util-linux/master/sys-utils/mount.8.adoc) — mount listing and read-write remount syntax.
- [OpenSSH sshd_config manual](https://man.openbsd.org/sshd_config#PermitRootLogin) — independent restrictions on root SSH authentication.
- [Author profile](https://github.com/nawazdhandala) — verified the attribution link resolves to the named author.

## Issues Found

- The pam_tally2 reset example assumed the default counter file even though the guide covers customized PAM configurations. Added a clarification to pass `--file /path/to/counter` when PAM specifies a custom `file=` value. The CLI otherwise targets `/var/log/tallylog`, so a reset could leave the actual login counter unchanged. Verified both the option and default against the upstream legacy manual. No sections were added or reorganized.

## Review Notes

- The temporary `rw init=/bin/bash` edit, F10 boot key, interactive password reset, `umount /`, and `reboot -f` sequence match the linked Photon procedure. The extra `sync` flush is consistent with the recovery workflow. The existing unmount-failure caveat appropriately avoids treating this as an ordinary systemd shutdown.
- `passwd root`, `passwd -S root`, `chage -l root`, read-write remount syntax, and the conditional PAM reset commands are valid. Password expiry, a locked password hash, account expiration, and failed-login counters are distinct conditions; the guide correctly avoids claiming that changing a password resolves all of them.
- pam_tally2 was removed upstream in Linux-PAM 1.5.0. Its conditional use remains appropriate for older or vendor-maintained images that actually configure and provide it. No particular PAM mechanism or default lockout policy is assumed for every Photon image.
- Root lockout depends on PAM policy, including options such as `even_deny_root`. Volatile faillock records may disappear on reboot; persistent records and custom locations require inspecting the installed configuration. The article already directs readers to use the configured location.
- Console authentication and SSH authorization are independent. The advice to test both without automatically changing SSH policy is correct.
- All external links present in the post resolved to their intended resources. Some additional GNU manual pages were unavailable through the browsing tool and were not counted as consulted sources.
- Validation was documentation-based, with Bash syntax checks of every Bash code block. No Photon VM boot, password mutation, PAM reset, unmount, or reboot was executed on the review host. Image-specific recovery still requires testing on the target system.
