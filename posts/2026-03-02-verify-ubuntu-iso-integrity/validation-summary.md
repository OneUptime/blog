# Validation Summary: How to Verify the Integrity of an Ubuntu ISO Before Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (24.04 LTS release artifacts)
- GnuPG (gpg) for signature verification
- sha256sum (GNU coreutils) for checksum verification
- PowerShell `Get-FileHash` (Windows)
- `shasum` (macOS)
- GPG4Win / GPG Suite / Homebrew (cross-platform GPG)
- `dd` and `head` for reading raw block devices (USB verification)
- Bash scripting

## Sources Consulted
- Ubuntu official tutorial: How to verify your Ubuntu download — https://ubuntu.com/tutorials/how-to-verify-ubuntu
- Ubuntu release directory listing: https://releases.ubuntu.com/24.04/
- GNU coreutils `dd` documentation (`dd --help`) confirming `count=NB` byte-suffix and the absence of `count_bytes` in the basic help output
- GnuPG manual for `--verify`, `--recv-keys`, `--keyserver`, `--keyid-format` flags
- PowerShell `Get-FileHash` cmdlet documentation
- macOS `shasum(1)` manual page

## Issues Found

1. **USB verification block was technically incorrect (would produce a wrong hash).** The original code computed `ISO_MB=$((ISO_BYTES / 1024 / 1024))` and then ran `dd if=/dev/sdX bs=1M count=$ISO_MB`. Because integer division truncates, this only reads an exact-MB multiple of bytes; Ubuntu ISOs are not typically a multiple of 1 MiB, so the resulting hash would not match the published SHA256SUMS value, defeating the entire purpose of the check. The block also defined `ISO_BLOCKS` but never used it, and computed `ISO_BYTES` twice (once via `stat`, once via `ls -l | awk`). Replaced with a `stat -c %s` + `sudo head -c "$ISO_BYTES" /dev/sdX | sha256sum` approach, which reads exactly the ISO's byte count regardless of block alignment.

## Review Notes

- The signing key fingerprint `0x843938DF228D22F7B3742BC0D94AA3F0EFE21092` ("Ubuntu CD Image Automatic Signing Key (2012)") is correct and matches Ubuntu's official documentation.
- For some Ubuntu releases, `SHA256SUMS.gpg` is signed by an additional, older DSA key (`C598 6B4F 1257 FFA8 6632 CBA7 4618 1433 FBB7 5451`). For Ubuntu 24.04 (Noble), the 2012 RSA key the post uses is sufficient — gpg will report a good signature from that key. The post could optionally mention the DSA key as well for completeness on older releases, but this is a future-improvement note, not an error.
- `hkp://keyserver.ubuntu.com` is correct; the modern `hkps://` variant works too but is not required for verification (the signature on the downloaded SHA256SUMS file is what establishes trust, not the keyserver transport).
- The `sha256sum --check SHA256SUMS --ignore-missing` invocation is valid GNU coreutils syntax and is the correct, modern way to verify a single ISO from a multi-ISO SHA256SUMS file.
- The PowerShell `Get-FileHash ... -Algorithm SHA256` and macOS `shasum -a 256` examples are correct.
- All referenced URLs (`releases.ubuntu.com/24.04`, `gpg4win.org`, `gpgtools.org`, `ubuntu.com/download/server`) are accurate and point to the correct projects.
- The automation script's use of `grep -q "Good signature"` on stderr of `gpg --verify` is a slightly fragile pattern (a future GPG localization could in theory change the wording), but it matches Ubuntu's own published verification snippet and is acceptable for an English-locale tutorial.
