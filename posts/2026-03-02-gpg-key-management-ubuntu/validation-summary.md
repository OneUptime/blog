# Validation Summary: How to Set Up GPG Key Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- GnuPG / GPG
- OpenPGP key generation and management
- GPG keyservers
- GPG configuration files
- Shell scripting for key backup

## Sources Consulted
- GnuPG manual: Operational GPG Commands, including `--full-generate-key`, `--generate-revocation`, `--export-secret-subkeys`, `--send-keys`, `--recv-keys`, and `--search-keys`: https://www.gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html
- GnuPG manual: OpenPGP Key Management, including generated revocation certificates and `openpgp-revocs.d`: https://www.gnupg.org/documentation/manuals/gnupg/OpenPGP-Key-Management.html
- GnuPG manual: GPG Configuration Options, including `keyid-format`, `default-recipient-self`, personal preferences, and deprecated `--keyserver` placement: https://gnupg.org/documentation/manuals/gnupg/GPG-Configuration-Options.html
- GnuPG manual: GPG Esoteric Options, including `throw-keyids`: https://gnupg.org/documentation/manuals/gnupg/GPG-Esoteric-Options.html
- GnuPG manual page for local installed GnuPG 2.4.4, checked with `gpg --help`, `gpg --version`, and `man gpg`.
- keys.openpgp.org GnuPG usage guide and FAQ, including upload behavior and email verification requirements: https://keys.openpgp.org/about/usage-gnupg/ and https://keys.openpgp.org/about/faq/

## Issues Found
- The permissions example used `chmod 600 ~/.gnupg/*`, which fails on subdirectories such as `private-keys-v1.d` and `openpgp-revocs.d`. Changed it to use `find` so directories are set to `700` and files to `600`.
- The key import section labeled an Ubuntu keyserver command as "Import from keys.gnupg.net". Updated the comment to "Import from Ubuntu's keyserver".
- The publishing section described `keys.openpgp.org` as "the OpenPGP keyserver network", but keys.openpgp.org is not the old synchronizing keyserver network. Updated the wording to identify the specific service.
- The multiple-keyserver upload example included `pgp.mit.edu`, an unreliable legacy keyserver choice for current guidance. Removed it and kept `keys.openpgp.org` and `keyserver.ubuntu.com`.
- The `gpg.conf` example configured `keyserver` there, but current GnuPG documentation marks the `gpg` keyserver option as deprecated and recommends using `dirmngr.conf`. Moved the default keyserver line into a `~/.gnupg/dirmngr.conf` example.
- The Ed25519 section overstated the security comparison with RSA 4096, and one `gpg.conf` comment claimed long key IDs prevent collision attacks. Reworded both to avoid overclaiming; fingerprints remain the safest key identifier.

## Review Notes
The remaining commands and explanations are consistent with current GnuPG behavior. keys.openpgp.org uploads with `--send-keys` work for key material, but email-address searchability requires the identity verification flow described by that service.
