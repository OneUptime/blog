# Validation Summary: How to Troubleshoot Clevis Binding Failures with Tang on RHEL

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Network-Bound Disk Encryption (NBDE)
- Clevis
- Tang
- LUKS and cryptsetup
- dracut and initramfs
- firewalld

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat NBDE technology article: https://access.redhat.com/articles/6987053
- firewalld firewall-cmd manual: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- cryptsetup isLuks manual page: https://man7.org/linux/man-pages/man8/cryptsetup-isluks.8.html
- cryptsetup manual page: https://man7.org/linux/man-pages/man8/cryptsetup.8.html

## Issues Found
- The LUKS key-slot check used `grep "Key Slot"`, which only matches older LUKS1-style output and can miss RHEL 9's default LUKS2 `Keyslots:` output. Updated the command to match both LUKS1 and LUKS2 output formats.
- The initramfs verification checked for the broad term `clevis`; Red Hat's documented verification checks for `clevis-luks`. Updated the command to use the more precise pattern.
- The initramfs rebuild instructions omitted installing `clevis-dracut` and did not use Red Hat's documented `--hostonly-cmdline` flow for Tang bindings that need early-boot networking. Added `dnf install clevis-dracut` and changed rebuild commands to `dracut -fv --regenerate-all --hostonly-cmdline`.
- The `rd.neednet=1` remediation wrote `kernel_cmdline="rd.neednet=1"` into a dracut configuration file, but Red Hat documents using `grubby --update-kernel=ALL --args="rd.neednet=1"` for that kernel argument. Updated the command accordingly.
- The Tang key-rotation remediation told clients to unbind and bind again. Red Hat documents checking rotated keys with `clevis luks report` and refreshing the binding with `clevis luks regen`. Updated the commands to use `list`, `report`, and `regen`.
- The debugging section described the binding command as "verbose output" even though no verbose flag was used. Reworded it to say the command captures output from the binding attempt.

## Review Notes
The remaining commands and examples are consistent with RHEL NBDE guidance and the relevant command manuals. The post assumes a root-volume early boot use case; non-root encrypted volumes may require `clevis-systemd`, `_netdev`, and related `crypttab` or `fstab` handling, which is outside the post's current scope.
