# Validation Summary: How to Use GPG for File Encryption on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GnuPG (GPG) 2.x — file and key management
- OpenPGP standard (RFC 4880 / RFC 9580)
- Symmetric encryption with AES-256
- Asymmetric (public-key) encryption — RSA and ed25519/cv25519
- gpg-agent and gpgconf
- Bash scripting (tar piping, parameter expansion)
- Ubuntu apt package management

## Sources Consulted
- GnuPG official documentation: https://www.gnupg.org/documentation/manuals/gnupg/
- gpg(1) man page (GnuPG 2.4.4)
- gpg-agent(1) and gpgconf(1) man pages
- GnuPG 2.4 release notes regarding the switch to ECC (ed25519/cv25519) as the default for `--gen-key`
- Ubuntu package metadata for `gnupg` (Ubuntu 24.04 ships GnuPG 2.4.4)
- RFC 4880 (OpenPGP Message Format) and RFC 9580 (current OpenPGP)
- Local `gpg --version` and `gpg --help` output to confirm flags

## Issues Found
1. **Typo in `encrypt-directory.sh` parameter expansion** — `OUTPUT="${DIRECTORY%.}-..."` strips a trailing literal `.` (rarely present) and leaves a trailing `/` in the output filename if the user passes a path like `mydir/`. Changed to `${DIRECTORY%/}` so a trailing slash is stripped, which is the conventional Bash idiom for normalising directory arguments.
2. **Misleading comment on detached-signature command** — The command used `--armor`, which produces a `.asc` file, but the preceding comment said "creates a separate .sig file". Also, `--sign --detach-sign` together is redundant (`--detach-sign` is its own command that already produces a signature). Simplified to `gpg --detach-sign --armor document.pdf` and updated the comments so the `.sig` vs `.asc` distinction is accurate.
3. **Deprecated `--use-standard-socket` flag** — `gpg-agent --daemon --use-standard-socket` uses a flag that has been a no-op since GnuPG 2.1.13 and is deprecated in current releases. Replaced both occurrences with the modern `gpgconf --launch gpg-agent`, which is the recommended way to ensure the agent is running.

## Review Notes
- `gpg --gen-key` is described as defaulting to ed25519. This is accurate for GnuPG 2.4+ (e.g. Ubuntu 24.04 LTS, which ships GnuPG 2.4.4). On Ubuntu 22.04 LTS (GnuPG 2.2.27) the same command still defaults to RSA 3072. The post does not pin a specific Ubuntu version, but readers on older LTS releases may see RSA keys produced.
- `gpg --list-keys --fingerprint user-id` works in practice but mixes a command (`--fingerprint`) with a command (`--list-keys`); the modern equivalent is `--list-keys --with-fingerprint`. Left as-is because the existing form is widely used and functional.
- ASCII armor is technically Radix-64 with a CRC, not plain base64; the post's description is close enough for a tutorial audience and was left unchanged.
- The batch-encrypt script's unquoted `$PATTERN` in the `for` loop relies on shell globbing, which is intentional and works as documented but will silently skip if no files match (mitigated by the `[ -f "$file" ] || continue` guard).
- Storing passphrases in environment variables and shell history (as in the encrypt-directory and batch scripts) is convenient for automation but has known security trade-offs; the post would benefit from a brief security note in a future revision, but the code itself is technically correct.
