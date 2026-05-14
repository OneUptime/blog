# Validation Summary: How to Use TPM 2.0 to Automatically Unlock LUKS Volumes on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- TPM 2.0
- LUKS and cryptsetup
- Clevis TPM2, Clevis LUKS, and Clevis SSS
- Tang network-bound disk encryption
- dracut initramfs generation

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening documentation, "Configuring manual enrollment of LUKS-encrypted volumes by using a TPM 2.0 policy": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- Red Hat Enterprise Linux 9 Security hardening documentation, "High-availability NBDE systems using Shamir's Secret Sharing": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- clevis-encrypt-tpm2(1) manual page: https://manpages.opensuse.org/Leap-15.6/clevis/clevis-encrypt-tpm2.1.en.html
- UAPI Group Linux TPM PCR Registry: https://uapi-group.org/specifications/specs/linux_tpm_pcr_registry/
- cryptsetup-open(8) manual page: https://man7.org/linux/man-pages/man8/cryptsetup-luksopen.8.html

## Issues Found
- The post overstated PCR 7-based TPM unlocking as proving the full firmware, bootloader, and kernel state. I changed the description and introduction to say the unlock depends on the selected TPM PCR policy, because PCR 7 covers Secure Boot policy while other PCRs cover other measured components.
- The "default PCR set" wording was inaccurate. The Clevis TPM2 pin has defaults, but if `pcr_ids` is omitted no PCR policy is used; the example explicitly binds PCR 7. I updated the text and comment to describe it as a common PCR 7 binding.
- The dracut rebuild examples used `dracut -fv`. Red Hat's Clevis LUKS guidance uses `dracut -fv --regenerate-all` on installed systems, so I updated the commands.
- The Clevis SSS example used a single Tang object. Red Hat documents Tang pins in SSS as an array of Tang pin configurations, so I changed it to `"tang":[{"url":"http://tang.example.com"}]`.
- The kernel-update rebind example switched from a strict PCR policy to PCR 7 only and assumed slot 1. I changed it to rebind the same strict PCR example and added a note to replace slot 1 with the slot from `clevis luks list`.
- The LUKS keyslot verification command grepped for `Key Slot`, which is brittle with LUKS2 output. I changed it to show the full `cryptsetup luksDump` output.
- The troubleshooting section checked only `/dev/tpm0` and `tpm2-abrmd`. Modern Linux systems can expose `/dev/tpmrm0` through the kernel resource manager and do not necessarily require `tpm2-abrmd`, so I updated the checks to inspect `/dev/tpm*` and `/dev/tpmrm0`.

## Review Notes
The tutorial is technically relevant and broadly aligned with Red Hat's Clevis TPM2 guidance after the fixes. PCR choices remain environment-specific; future improvements could mention that systems using UKIs or systemd-stub may use different PCRs than GRUB-based RHEL systems.
