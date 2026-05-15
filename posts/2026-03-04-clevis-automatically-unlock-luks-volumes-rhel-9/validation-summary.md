# Validation Summary: How to Configure Clevis to Automatically Unlock LUKS Volumes on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Clevis
- Tang
- LUKS and cryptsetup
- Network-Bound Disk Encryption
- dracut
- systemd
- grubby

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Configuring automated unlocking of encrypted volumes by using policy-based decryption": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/security_hardening/installing-an-encryption-client-clevis_configuring-automated-unlocking-of-encrypted-volumes-using-policy-based-decryption
- Red Hat Enterprise Linux 9 Security hardening, static IP configuration for NBDE clients: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/security_hardening/configuring-applications-to-use-cryptographic-hardware-through-pkcs-11_security-hardening
- clevis-luks-unlock(1) man page: https://www.mankier.com/1/clevis-luks-unlock
- clevis-luks-unlockers(7) man page: https://www.mankier.com/7/clevis-luks-unlockers
- tang-show-keys(1) man page: https://www.mankier.com/1/tang-show-keys
- cryptsetup-luksDump(8) man page: https://www.mankier.com/8/cryptsetup-luksDump
- dracut.cmdline(7) man page: https://www.mankier.com/7/dracut.cmdline

## Issues Found
- The LUKS key slot verification command used `grep "Key Slot"`, which is unreliable for LUKS2 output. Changed it to match the `Keyslots` heading and numbered slot entries.
- The text said the user would see the original passphrase and Clevis-managed key. `cryptsetup luksDump` shows key slot metadata, not the passphrase or key material. Updated the wording to say the enabled slots are listed.
- The early boot unlock section said it applied to "the root volume or any volume needed at boot." Clevis documentation describes dracut early boot unlocking for the root volume, with non-root volumes handled by the late boot systemd unlocker. Narrowed the statement to the root volume.
- The text implied a plain `dracut -fv` adds networking components. Updated the wording to say it adds Clevis support, with network configuration handled in the following section.
- The binding test described `clevis luks unlock -d /dev/sda3` as a non-unlocking verification. The command actually unlocks a LUKS device; the `-t SLT` option tests the passphrase for a given slot without unlocking. Updated the example to use `-t 1` and instruct the reader to replace `1` with the Clevis slot from `clevis luks list`.

## Review Notes
The remaining commands and explanations align with RHEL 9 NBDE guidance and the Clevis, Tang, cryptsetup, dracut, and systemd man pages. In a future revision, the post could mention Red Hat's `--hostonly-cmdline` or `hostonly_cmdline=yes` approach for initramfs generation, but the existing `rd.neednet=1` configuration pattern is still documented and valid.
