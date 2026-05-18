# Validation Summary: How to Set Up systemd-homed for Modern User Management on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- systemd-homed (systemd 245+)
- homectl CLI
- LUKS-backed home directory storage
- PAM (pam_systemd_home.so)
- FIDO2 hardware tokens
- Ubuntu package management (apt, dpkg)
- SSH PAM integration

## Sources Consulted
- Ubuntu manpage for `homectl(1)` (noble): https://manpages.ubuntu.com/manpages/noble/man1/homectl.1.html
- Ubuntu manpage for `pam_systemd_home(8)` (noble): https://manpages.ubuntu.com/manpages/noble/man8/pam_systemd_home.8.html
- systemd-homed source / upstream documentation for the list of `homectl` subcommands and storage backends

## Issues Found
1. **Non-existent `homectl adopt` subcommand.** The Portable Home Directories section instructed readers to run `sudo homectl adopt /path/to/alice.home` on the target machine. No such subcommand exists in `homectl` (subcommands are: list, activate, deactivate, inspect, authenticate, create, remove, update, passwd, resize, lock, unlock, lock-all, deactivate-all, with, rebalance, firstboot). Replaced with the actual procedure: copy the `.home` (and `.identity`) file into `/var/lib/systemd/home/`, restart `systemd-homed`, then `homectl activate`. Added a note that the identity record is also embedded in the LUKS header so the image alone is generally sufficient.
2. **Non-existent `--keep-home` flag on `homectl remove`.** The Removing a homed User section showed `sudo homectl remove --keep-home alice`. The `remove` subcommand has no such flag — it always deletes both the user record and the home directory. Replaced with the correct workaround: deactivate the user and copy the `.home` file out of `/var/lib/systemd/home/` before running `homectl remove`.
3. **Missing `##` markdown heading prefix.** The "Resource Limits per User" heading was rendered as plain text rather than an H2. Added `##`.

## Review Notes
- The PAM stanza shown in the PAM Integration section places `pam_unix.so` before `pam_systemd_home.so`, both as `sufficient`. The upstream example in `pam_systemd_home(8)` typically lists `pam_systemd_home.so` first (with a leading `-` to make missing-module failures non-fatal), but both orderings are functional because each module only authenticates its own user class and falls through otherwise. Left as-is since it is not incorrect.
- The example JSON output from `homectl inspect --json=short alice` is heavily simplified — the real output contains many more fields (signature, privileged section, perMachine, status, binding, etc.). The post explicitly calls it an example, so this is acceptable for a tutorial.
- The `systemd-homed` Ubuntu package availability note (systemd 245+) is correct; it is available as a standalone `systemd-homed` package on Ubuntu 22.04 (jammy) and later.
- The "UIDs are dynamically assigned" wording in the Limitations section is slightly loose — homed UIDs are stable per user record once assigned, but they live outside `/etc/passwd` and require NSS (nss-systemd) to resolve. The practical point the author is making (that tools reading `/etc/passwd` directly miss these users) is correct.
