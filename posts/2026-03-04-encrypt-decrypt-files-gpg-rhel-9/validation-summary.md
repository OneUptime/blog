# Validation Summary: How to Encrypt and Decrypt Files with GPG on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- GnuPG / GPG
- OpenPGP symmetric and public-key encryption
- gpg-agent passphrase caching
- GNU tar
- GNU coreutils shred
- PostgreSQL backup and restore pipelines

## Sources Consulted
- GnuPG manual: gpg operational commands and options, including `--encrypt`, `--symmetric`, `--recipient`, `--armor`, `--output`, `--list-packets`, `--cipher-algo`, `--batch`, `--passphrase-fd`, and `--pinentry-mode`: https://www.gnupg.org/documentation/manuals/gnupg/
- GnuPG manual: gpg-agent cache options, including `default-cache-ttl`, `max-cache-ttl`, and reload behavior: https://www.gnupg.org/documentation/manuals/gnupg/Agent-Options.html
- Local GnuPG 2.4 man pages and `--help` output for `gpg`, `gpg-agent`, and `gpg-connect-agent`.
- GNU tar manual for gzip archive creation and extraction via pipelines: https://www.gnu.org/software/tar/manual/tar.html
- GNU coreutils `shred` manual for overwrite/remove flags and secure deletion caveats: https://www.gnu.org/software/coreutils/manual/html_node/shred-invocation.html

## Issues Found
- The symmetric decryption example described `gpg --output myfile.txt --decrypt myfile.txt.gpg` as letting GPG figure out the output filename. This command explicitly sets the output filename, so the comment was corrected.
- The unattended backup encryption command used `--passphrase-fd` with `--batch` but omitted `--pinentry-mode loopback`. GnuPG documentation states that, since GnuPG 2.1, passphrase options require loopback pinentry mode for this usage, so `--pinentry-mode loopback` was added.
- The packet inspection example said `--list-packets --verbose` shows who can decrypt the file. For public-key encryption it can show recipient key IDs when they are not hidden, but it does not generally identify every decrypting party and is not meaningful for symmetric-only files. The comment was clarified.
- The secure deletion section implied `shred` securely deletes the original file without caveats. GNU coreutils documents important limitations for filesystems and storage that do not overwrite data in place, as well as backups and mirrors. A best-effort caveat was added.

## Review Notes
The rest of the GPG encryption, decryption, signing, recipient, ASCII armor, tar pipeline, key import, gpg-agent cache, and batch loop examples are technically valid for current GnuPG behavior on RHEL-like systems. Future improvements could mention trust/fingerprint verification for imported public keys, but the existing commands are correct.
