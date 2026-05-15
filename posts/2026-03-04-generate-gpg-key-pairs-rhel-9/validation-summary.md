# Validation Summary: How to Generate GPG Key Pairs on RHEL for File Encryption

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GnuPG/GPG 2
- OpenPGP
- Ed25519, Curve25519, RSA, and NIST P-384 key algorithms
- Batch key generation configuration
- Linux entropy and rngd

## Sources Consulted
- GnuPG manual: Unattended GPG key generation, https://gnupg.org/documentation/manuals/gnupg/Unattended-GPG-key-generation.html
- GnuPG `gpg(1)` manual page, https://gnupg.org/documentation/manuals/gnupg26/gpg.1.html
- Red Hat Enterprise Linux 9 documentation: Creating a GPG2 key, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/getting_the_most_from_your_support_experience/getting_the_most_from_your_support_experience
- Red Hat Enterprise Linux 9 Security hardening documentation: system-wide cryptographic policies, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/security_hardening/security_hardening
- RFC 9580: OpenPGP, https://www.rfc-editor.org/rfc/rfc9580
- Local GnuPG 2.4.4 `--version`, `--help`, `gpg(1)` output, and temporary-keyring test runs for the batch examples.

## Issues Found
- The post said `gpg --version` should show "2.3.x or later on RHEL". RHEL 9 currently packages GnuPG in the 2.3.x line, so the wording was narrowed to avoid implying that all RHEL 9 systems report a later major/minor release.
- The quick key generation section claimed `gpg --generate-key` creates an Ed25519 key with a 2-year expiration. GnuPG documents this as using current default parameters, and tested current defaults did not match the hard-coded 2-year claim. The text now says it uses current GnuPG defaults, typically Ed25519 with a Curve25519 encryption subkey on RHEL 9, and a default expiration interval.
- The batch-key note suggested placing a passphrase directly in the batch file without mentioning file protection. The text now warns to use `Passphrase:` only in a protected batch file that is deleted immediately after use.

## Review Notes
The batch configuration examples were tested in isolated temporary `GNUPGHOME` directories and generated the expected signing primary keys and encryption subkeys. GnuPG also automatically stores a revocation certificate under `openpgp-revocs.d` during key generation; the manual `--gen-revoke` step remains valid as an explicit export workflow.
