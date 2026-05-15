# Validation Summary: How to Configure LUKS Encryption with a TPM 2.0 Key on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- LUKS disk encryption
- Clevis policy-based decryption
- TPM 2.0
- TPM PCR policies
- dracut initramfs integration
- systemd cryptsetup integration
- Tang and Shamir's Secret Sharing

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening: Configuring automated unlocking of encrypted volumes by using policy-based decryption: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/configuring-automated-unlocking-of-encrypted-volumes-using-policy-based-decryption_security-hardening
- Red Hat Enterprise Linux 9 Security hardening: Configuring manual enrollment of LUKS-encrypted volumes by using a TPM 2.0 policy: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/configuring-automated-unlocking-of-encrypted-volumes-using-policy-based-decryption_security-hardening#configuring-manual-enrollment-of-luks-encrypted-volumes-by-using-a-tpm-2-0-policy_configuring-automated-unlocking-of-encrypted-volumes-using-policy-based-decryption
- tpm2-tools tpm2_pcrread manual: https://tpm2-tools.readthedocs.io/en/stable/man/tpm2_pcrread.1/
- Clevis upstream README and examples: https://github.com/latchset/clevis
- Clevis LUKS unlock manual page: https://manpages.debian.org/testing/clevis-luks/clevis-luks-unlock.1.en.html

## Issues Found
- The introduction and summary overstated that the TPM stores the LUKS encryption key and that the disk can only be unlocked on an original hardware/software configuration. Updated the wording to describe Clevis sealing key material to selected PCR measurements, which is more precise and matches Red Hat's description.
- The post implied that any boot-chain change would necessarily prevent unlock. Updated this to specify that only changes measured into the selected PCRs affect unsealing.
- The basic TPM binding comment said PCR 7 was a default. Clevis does not default to PCR 7; the command explicitly sets `pcr_ids` to `7`. Updated the comment.
- The SSS example claimed to require TPM and a passphrase, but the command actually combined TPM and Tang. Updated the heading and prose, and changed the Tang child pin to the array form used in Red Hat's SSS examples.
- The non-root volume boot integration section implied enabling `clevis-luks-askpass.path` was sufficient. Added the required `/etc/crypttab` `_netdev` note based on Red Hat's documented systemd integration behavior.
- The PCR 7-only example claimed it detects firmware tampering. PCR 7 tracks Secure Boot state/policy, so the wording was narrowed to changes in Secure Boot state.

## Review Notes
The remaining commands and examples are consistent with Red Hat's RHEL 9 Clevis documentation and the referenced command manuals. PCR selection is environment-specific; future revisions could add a short note that administrators should choose PCRs based on their boot stack and update policy.
