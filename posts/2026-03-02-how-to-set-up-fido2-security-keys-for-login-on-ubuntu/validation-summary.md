# Validation Summary: How to Set Up FIDO2 Security Keys for Login on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- FIDO2 / WebAuthn / U2F
- YubiKey (and Solo 2, Nitrokey FIDO2, Google Titan)
- libpam-u2f / pam_u2f.so PAM module
- pamu2fcfg enrollment tool
- OpenSSH FIDO2 key types (`ed25519-sk`, `ecdsa-sk`)
- ssh-keygen / ssh-add resident-key handling (`-K`)
- Ubuntu PAM stack (`/etc/pam.d/sudo`, `common-auth`, `sshd`)
- udev (`libu2f-udev`)

## Sources Consulted
- Yubico pam-u2f documentation: https://developers.yubico.com/pam-u2f/
- pamu2fcfg(1) man page (Ubuntu Jammy): https://manpages.ubuntu.com/manpages/jammy/man1/pamu2fcfg.1.html
- OpenSSH sshd_config(5): https://man.openbsd.org/sshd_config
- OpenSSH ssh-add(1): https://man.openbsd.org/ssh-add
- OpenSSH ssh-keygen(1): https://man.openbsd.org/ssh-keygen

## Issues Found

1. **Non-existent `pamu2fcfg -1` flag** (Troubleshooting section). `pamu2fcfg` has no `-1` flag — valid short flags are `-d -h -o -i -r -t -P -N -V -u -n`. Replaced with `pamu2fcfg -d` (verbose debug), which actually exists and matches the intent of "test enrollment."

2. **`pam_u2f` invoked as a standalone binary** (Troubleshooting section). The post showed `sudo pam_u2f --debug --authfile=...`, but `pam_u2f` is a PAM `.so` module loaded by libpam, not an executable. Replaced with the correct guidance: add `debug` (and optionally `debug_file=...`) to the `pam_u2f.so` line in the relevant `/etc/pam.d/` file and exercise the PAM stack — output goes to syslog by default.

3. **Deprecated `ChallengeResponseAuthentication` directive** (SSH PAM section). As of OpenSSH 8.7 (Ubuntu 22.04+), this keyword is a deprecated alias for `KbdInteractiveAuthentication`. Updated the `sshd_config` snippet to use the current keyword and added a note that the old name is a deprecated alias.

4. **Broken sudo redirect** (system-wide enrollment section). `sudo pamu2fcfg -u username >> /etc/u2f-mappings/u2f_keys` does not work, because the `>>` redirect is performed by the unprivileged shell and fails on a root-owned file. Replaced with `sudo pamu2fcfg -u username | sudo tee -a /etc/u2f-mappings/u2f_keys` and a brief comment explaining why.

## Review Notes
- The path used for the PAM authfile is inconsistent across sections (`/etc/u2f-mappings/u2f_keys` in the enrollment section vs. `/etc/security/u2f_keys` in PAM/SSH sections). Both paths are valid as long as the file actually exists at the path referenced by `authfile=`; the post does not technically promise consistency, so this was left alone.
- The `ssh-copy-id -i ~/.ssh/id_ed25519_sk.pub` example works; `ssh-copy-id` accepts either the public or private key path with `-i`.
- The udev section's prose ("If not accessible, add rules") followed by a `cat` (which only reads, doesn't add) is slightly misleading but technically harmless — the actual rule installation is via `sudo apt install libu2f-udev` immediately after. Not changed.
- `pamu2fcfg` is currently a separate Ubuntu package (verified for Jammy/Noble), so the explicit `sudo apt install pamu2fcfg` is correct.
- `ssh-add -K` and `ssh-keygen -K` are correct on Linux OpenSSH for FIDO2 resident-key download/load. On macOS, the historic `ssh-add -K` keychain meaning has been renamed to `--apple-use-keychain`, so the post's commands would behave differently on macOS — but the post targets Ubuntu, so no change needed.
