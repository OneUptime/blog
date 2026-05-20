# Validation Summary: How to Use GnuPG for Email Encryption on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- GnuPG / GPG
- OpenPGP
- PGP email encryption and signing
- Thunderbird OpenPGP integration
- keys.openpgp.org keyserver

## Sources Consulted
- GnuPG gpg(1) manual: https://gnupg.org/documentation/manuals/gnupg26/gpg.1.html
- Local GnuPG 2.4.4 `gpg --help` and `man gpg` output
- RFC 9580, OpenPGP: https://www.rfc-editor.org/rfc/rfc9580
- Thunderbird OpenPGP HOWTO and FAQ: https://support.mozilla.org/en-US/kb/openpgp-thunderbird-howto-and-faq
- GnuPG wiki, Thunderbird email client notes: https://wiki.gnupg.org/EMailClients/Thunderbird
- keys.openpgp.org GnuPG usage guide: https://keys.openpgp.org/about/usage-gnupg/
- Ubuntu package metadata for `gnupg` and `gnupg2`

## Issues Found
- The Ubuntu installation command used `sudo apt install -y gnupg2`. On current Ubuntu, `gnupg` is the main package and `gnupg2` is a dummy transitional package that depends on `gnupg` and provides `gpg2` symlinks. Changed the command to install `gnupg` and clarified that Ubuntu packages GnuPG 2 as the `gpg` command.
- The quick modern key example created an Ed25519 certification-only primary key and a Cv25519 encryption subkey, but no signing-capable key. That would make the later signing examples fail for that key setup. Added `gpg --quick-add-key <FINGERPRINT> ed25519 sign 2y` and updated the explanatory sentence.
- The Thunderbird section implied that choosing an external GnuPG key was the default flow and that Thunderbird simply needed to be told where GPG is. Official Thunderbird documentation says external GnuPG support must be enabled for secret-key operations, while public keys and acceptance settings remain managed internally. Updated the steps to enable `mail.openpgp.allow_external_gnupg`, mention `mail.openpgp.alternative_gpg_path` if needed, and clarify the internal public-key handling.
- The key expiration instructions described `key 0` as selecting the master key. In `gpg --edit-key`, `key 0` deselects subkeys so subsequent commands affect the primary key. Corrected the comment.

## Review Notes
- The remaining GnuPG commands and flags were checked against GnuPG documentation and local GnuPG 2.4.4 help/man-page output.
- The `keys.openpgp.org` upload command is valid, but keys uploaded with `--send-keys` may require email-address verification before they are searchable by email address.
