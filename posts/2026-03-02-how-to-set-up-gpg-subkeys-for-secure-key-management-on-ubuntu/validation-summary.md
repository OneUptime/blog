# Validation Summary: How to Set Up GPG Subkeys for Secure Key Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GnuPG (GPG) 2.x
- OpenPGP key format (RFC 4880 / 9580)
- Ed25519 and Curve25519 (cv25519) elliptic curves
- RSA cryptography
- gpg-agent (SSH agent integration)
- OpenPGP Smart Card / YubiKey
- Ubuntu Linux

## Sources Consulted
- GnuPG official manual: https://www.gnupg.org/documentation/manuals/gnupg/
- GnuPG `gpg(1)` man page (commands: `--full-generate-key`, `--edit-key`, `--export-secret-subkeys`, `--export-ssh-key`, `--delete-secret-key`, `--gen-revoke`, `--show-keys`)
- `gpg-agent(1)` man page (options: `enable-ssh-support`, `default-cache-ttl`, `max-cache-ttl`)
- `gpgconf(1)` man page (`--list-dirs agent-ssh-socket`, `--launch`, `--kill`)
- Debian/Ubuntu GPG subkey wiki: https://wiki.debian.org/Subkeys
- OpenPGP card specification (slot mapping: 1=signature, 2=encryption, 3=authentication)
- Yubico GPG / smart card documentation: https://developers.yubico.com/PGP/

## Issues Found
No technical issues found.

All commands, flags, menu numbers, and output formats were verified:
- `gpg --full-generate-key` and interactive menu options are accurate.
- `--expert --edit-key` addkey numbering (10 = ECC sign only, 11 = ECC set capabilities, 12 = ECC encrypt only, 4 = RSA sign, 6 = RSA encrypt) matches current GnuPG 2.2+/2.4 behavior.
- The `cv25519` algorithm label for the encryption subkey is correct (ed25519 is sign-only; Curve25519/cv25519 is used for ECDH encryption).
- The `sec#` notation correctly indicates that the secret primary key is a stub (not present on the keyring).
- `gpg --export-ssh-key` (introduced in GnuPG 2.1.11) is correct.
- The gpg-agent SSH socket discovery via `gpgconf --list-dirs agent-ssh-socket` is the recommended method.
- `default-cache-ttl 600` and `max-cache-ttl 7200` match GnuPG defaults.
- YubiKey/OpenPGP card slot numbering (1=signature, 2=encryption, 3=authentication) is correct.
- The `keytocard` workflow with `key N` toggle for selection/deselection is accurate.

## Review Notes
- The author shows `default-cache-ttl 600` and `max-cache-ttl 7200`, which happen to be the GnuPG defaults — setting them explicitly is harmless and serves as documentation.
- For users on Wayland desktops, `pinentry-gtk2`/`pinentry-qt` may need to be configured separately for passphrase prompts; not covered but outside the scope of this tutorial.
- The post uses `keys.openpgp.org` as the keyserver, which is the modern recommended choice (note: it only publishes user IDs after email verification, which is correct behavior but worth knowing).
- `gpg --gen-revoke` will prompt interactively for reason/confirmation before writing the certificate to stdout; the `>` redirect works because the certificate goes to stdout while prompts go to the controlling terminal.
- Modern GnuPG (2.1.17+) automatically creates a revocation certificate in `~/.gnupg/openpgp-revocs.d/` at key generation time, so the manual `--gen-revoke` step is an extra (still useful) backup.
- Default expiration recommendation (1 year for subkeys) is a reasonable industry practice.
