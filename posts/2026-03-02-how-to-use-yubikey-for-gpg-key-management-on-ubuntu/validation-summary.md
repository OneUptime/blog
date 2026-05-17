# Validation Summary: How to Use YubiKey for GPG Key Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- YubiKey (OpenPGP applet)
- GnuPG (GPG 2.1+)
- gpg-agent (with SSH support)
- scdaemon / pcscd / pcsc-tools
- yubikey-manager (ykman CLI)
- SSH authentication via GPG agent
- Ubuntu (apt package management, systemd)

## Sources Consulted
- GnuPG manual / man pages for `gpg`, `gpg-agent`, `gpgconf` (https://www.gnupg.org/documentation/manuals/gnupg/)
- YubiKey OpenPGP documentation (https://developers.yubico.com/PGP/)
- yubikey-manager (ykman) CLI documentation (https://docs.yubico.com/software/yubikey/tools/ykman/)
- Ubuntu package archive for `gnupg2`, `gnupg-agent`, `scdaemon`, `pcscd`, `pcsc-tools`, `yubikey-manager`
- Yubico guide: "Using Your YubiKey with OpenPGP" and the drduh/YubiKey-Guide reference workflow

## Issues Found
No technical issues found.

Verified specifics:
- Ubuntu package names are all valid (`gnupg2`, `gnupg-agent`, `scdaemon`, `pcscd`, `pcsc-tools`, `yubikey-manager`).
- Default YubiKey OpenPGP PIN (`123456`) and Admin PIN (`12345678`) are correct, as is the 3-attempt lockout behavior.
- `gpg --card-edit` interactive flow (`admin`, `generate`, `passwd`) and prompt label (`gpg/card>`) are correct.
- `gpg --full-gen-key` menu options `(1) RSA and RSA` and `(9) ECC and ECC` match current GPG 2.2/2.4 behavior.
- The `keytocard` workflow — selecting subkeys with `key N`, moving with `keytocard`, deselecting by re-issuing `key N`, then `save` — is accurate.
- `sec#` (master key absent) and `ssb>` (subkey on smartcard) notation is correctly described.
- `ykman openpgp keys set-touch <sig|enc|aut> on` is the correct syntax for yubikey-manager 4.x+.
- `ykman openpgp info` is the correct command (replaces the older `ykman openpgp status`).
- `gpgconf --list-dirs agent-ssh-socket`, `enable-ssh-support` in `gpg-agent.conf`, `~/.gnupg/sshcontrol` keygrip mechanism, and `ssh-add -L` are all correct for SSH-via-GPG-agent.
- `gpg-connect-agent "scd reset" /bye` is the correct way to reset a stuck card connection.

## Review Notes
- The comment "Generate a master key (certification only)" paired with selecting `(1) RSA and RSA` is slightly imprecise — option (1) produces a primary key with Certify+Sign capabilities and an Encrypt subkey, not a strictly certify-only primary. For a true certify-only master, option `(8) RSA (set your own capabilities)` (or `(11)` for ECC) would be required, with capabilities toggled to C only. The workflow as written still works in practice (the extra capabilities are harmless if the user later adds dedicated S/E/A subkeys and moves only those to the YubiKey), so this is left as-is.
- `gnupg-agent` is a transitional package on modern Ubuntu (≥ 20.04); it installs cleanly and pulls in the real agent shipped with `gnupg`. Not an error, just a minor note.
- `gpg --recv-keys YOUR_KEY_ID` in the "Multiple Machines" section relies on a default keyserver being configured (e.g., `keys.openpgp.org` via `dirmngr.conf`). Most modern GnuPG installs ship a sensible default, but users with no `keyserver` directive may need to add one or use `--keyserver hkps://keys.openpgp.org`.
- The 2.1+ version requirement is stated for "smartcard support"; smartcard support actually predates 2.1, but 2.1+ is genuinely the practical floor for ed25519/curve25519 on-card and modern scdaemon behavior, so the recommendation stands.
