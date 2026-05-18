# Validation Summary: How to Test Snap Packages Locally on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Snap (snapd) package format
- Snapcraft (build tooling)
- AppArmor (sandbox / confinement denials)
- systemd journal (`journalctl`) for snap service logs
- Ubuntu CLI tooling (`dmesg`, `strace`, `sudo -u`)

## Sources Consulted
- `snap remove --help` and `snap interface --help` output (snapd CLI)
- Snapcraft documentation on confinement and interfaces: https://snapcraft.io/docs/snap-confinement and https://snapcraft.io/docs/interface-management
- Snap directory documentation: https://snapcraft.io/docs/data-locations
- `journalctl(1)` man page (for `-k`/`--dmesg` vs `-t`/`--identifier`)
- Direct inspection of `~/snap/<snap>/` layout on a live Ubuntu system

## Issues Found
1. **Reversed comments on `snap remove` / `snap remove --purge`.** The post claimed plain `snap remove` removes all data while `--purge` keeps user data. The actual behavior (per `snap remove --help`) is the opposite: the default saves a snapshot of the snap's data, and `--purge` removes the snap *without* saving a snapshot. Comments rewritten to match.
2. **`journalctl -t kernel` for AppArmor denials is unreliable.** The `-t` filter matches `SYSLOG_IDENTIFIER`, which is not guaranteed to be `kernel` for kernel-emitted messages on every system. Replaced with the canonical `journalctl -k` (alias `--dmesg`), which always shows kernel messages from the current boot.
3. **Incorrect claim that `network` / `network-observe` "provides `/etc/hosts` access".** Read access to `/etc/hosts` is granted by the default snap base policy, not by either of these interfaces. Replaced with a more accurate, generic instruction to add the appropriate interface plug (e.g. `network`, `home`, or `system-files`) for whatever resource the denial actually concerns.
4. **Non-existent `~/snap/my-app/previous/` directory.** Snap does not create a `previous` symlink; it keeps per-revision directories (`<revision_number>/`) plus a `current` symlink and a `common/` directory shared across revisions (verified on a running Ubuntu system). Rewrote the "Snap Data Directories" listing to describe the real layout (`current`, `common`) for both user data (`~/snap/...`) and system data (`/var/snap/...`).

## Review Notes
- The `snap logs` command technically works without `sudo` for the user's own viewing in many setups, but `sudo` is harmless and matches what most tutorials show; left as-is.
- `strace -e trace=openat my-app 2>&1 | grep -v "= -1"` will only show *successful* opens (it filters errors, which is the opposite of what you usually want for diagnosing confinement failures). Technically correct, just an unusual choice — not a bug, so left untouched per "only fix technical errors".
- `snap install --dangerous` does install with whatever confinement is declared in the snap; the post's explanation that this also exercises strict confinement (when declared) is correct.
- The example AppArmor denial log line format matches what shows up in `dmesg`/`journalctl -k` on current Ubuntu releases.
