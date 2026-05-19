# Validation Summary: How to Revert a Snap to a Previous Revision on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Snap / snapd (Canonical's package manager)
- Ubuntu
- Bash scripting
- Linux filesystem (squashfs, /var/lib/snapd, ~/snap, /var/snap)

## Sources Consulted
- [Manage updates - Snap documentation](https://snapcraft.io/docs/how-to-guides/manage-snaps/manage-updates/)
- [System options - Snapcraft documentation](https://snapcraft.io/docs/system-options)
- [Create data snapshots - Snap documentation](https://snapcraft.io/docs/how-to-guides/manage-snaps/create-data-snapshots/)
- [Snapshots - Snapcraft documentation](https://snapcraft.io/docs/snapshots/)
- [Ubuntu Manpage: snap](https://manpages.ubuntu.com/manpages/focal/en/man8/snap.8.html)

## Issues Found

1. **`snap get firefox refresh.hold` is not a valid way to check a per-snap hold.** Per-snap holds are not stored as snap configuration accessible via `snap get`. The documented method is to look for `held` in the Notes column of `snap list`, or use `snap refresh --time`. Fixed by replacing the incorrect command with `snap list firefox` (with a comment noting to look for `held` in the Notes column).

2. **`sudo snap set system snapshots.automatic.retention=no` was placed under a comment claiming it removes disabled (old) revisions.** This setting actually disables automatic *data snapshots* (taken when a snap is removed or refreshed) — it has nothing to do with removing old/disabled revisions. Fixed by removing this misplaced line and the misleading comment.

3. **`sudo snap set system refresh.retain=1` is invalid.** Per the snapd documentation, `refresh.retain` only accepts values between 2 and 20; snapd will reject `1`. Fixed by removing the invalid `refresh.retain=1` example and adding a sentence clarifying that the valid range is 2–20.

## Review Notes
- The default `refresh.retain` value differs by edition: 2 on classic Ubuntu, 3 on Ubuntu Core. The post (after the fix) accurately reflects the classic Ubuntu default.
- `snap refresh --hold=forever` and durations like `--hold=720h` are both valid syntaxes — verified against official docs.
- `snap revert --revision <N>` is correct (the `--revision=N` form also works).
- The `snap save` / `snap saved` / `snap restore <set-id>` sequence is accurate; the post calls the set-id a `<snapshot-id>`, which is acceptable plain-English terminology.
- The cleanup script's `read name version rev track publisher notes` field count matches the columns of `snap list --all`; the `grep "disabled"` filter also conveniently skips the header line.
- Disk paths referenced (`/var/lib/snapd/snaps/`, `~/snap/<snapname>/`, `/var/snap/<snapname>/`) are all correct.
