# Validation Summary: How to Configure NBDE with Multiple Tang Servers for High Availability on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Network-Bound Disk Encryption (NBDE)
- Clevis
- Tang
- LUKS / cryptsetup
- dracut initramfs generation
- Shamir's Secret Sharing (SSS)

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Configuring NBDE clients for automated unlocking of LUKS-encrypted volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 Security hardening documentation, "Deploying high-availability NBDE systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 Security hardening documentation, "Rotating Tang server keys and updating bindings on clients": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 Security hardening documentation, "Changing the LUKS passphrase by using the command line": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- dracut.conf(5) manual reference: https://man7.org/linux/man-pages/man5/dracut.conf.5.html

## Issues Found
- The initramfs rebuild snippet used a `kernel_cmdline="rd.neednet=1"` dracut configuration file. RHEL 9 documents installing `clevis-dracut` and regenerating with `dracut -fv --regenerate-all --hostonly-cmdline`, or using `hostonly_cmdline=yes`, so that dracut adds `rd.neednet=1` when it detects a Tang binding. Updated the snippet to use the documented `clevis-dracut` and `--hostonly-cmdline` flow.
- The Tang key rotation snippet generated new keys without first hiding the existing keys from Tang advertisements. RHEL 9 documents renaming existing `/var/db/tang/*.jwk` files with a leading dot before running `/usr/libexec/tangd-keygen /var/db/tang`. Updated the snippet to hide old keys before generating new ones.

## Review Notes
The Clevis SSS JSON examples, `clevis luks bind`, `clevis luks list`, `clevis luks unlock`, `clevis luks regen`, Tang `/adv` checks, and `cryptsetup open --test-passphrase` usage are consistent with the reviewed Red Hat documentation. The examples assume the reader substitutes the correct encrypted block device and validates key slots before running regeneration commands.
