# Validation Summary: How to Manage GPG Keyrings and Trust Levels on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GnuPG / GPG
- OpenPGP keyrings
- GPG ownertrust and Web of Trust
- RHEL Linux command-line key management

## Sources Consulted
- GnuPG Manual: Trust Values - https://www.gnupg.org/documentation/manuals/gnupg/Trust-Values.html
- GnuPG Manual: Operational GPG Commands - https://www.gnupg.org/documentation/manuals/gnupg/Operational-GPG-Commands.html
- GnuPG Manual: OpenPGP Key Management - https://www.gnupg.org/documentation/manuals/gnupg/OpenPGP-Key-Management.html
- GnuPG 2.4 gpg(1) manual - https://www.gnupg.org/documentation/manuals/gnupg24/gpg.1.html
- Local GnuPG CLI output from `gpg --version`, `gpg --help`, `gpg --dump-options`, and `man gpg`

## Issues Found
- The key-validity explanation stated that one fully trusted signature or three marginally trusted signatures make a key valid as an unconditional rule. GnuPG's default Web of Trust settings use one fully trusted introducer and three marginally trusted introducers, but these thresholds are configurable with `--completes-needed` and `--marginals-needed`, and the trust model itself can be changed. Updated the text to say this applies to the default Web of Trust model and to identify the values as defaults.

## Review Notes
- The listed GPG commands and flags were checked against the current GnuPG command documentation and local CLI/man-page output. They are valid.
- `gpg --delete-secret-and-public-keys` is accepted by the local GnuPG CLI even though some GnuPG manual pages document the singular spelling `--delete-secret-and-public-key`.
- Publishing revocations to `keys.openpgp.org` is plausible, but keys.openpgp.org has identity-verification behavior for user IDs, so keyserver publication behavior can differ from traditional synchronizing keyservers.
