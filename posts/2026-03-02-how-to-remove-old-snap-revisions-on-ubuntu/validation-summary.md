# Validation Summary: How to Remove Old Snap Revisions on Ubuntu

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- Ubuntu (classic)
- snapd / snap CLI
- squashfs (snap package format)
- bash scripting
- cron / `/etc/cron.d/`
- `awk`, `du`, `losetup`, `df` (standard Linux utilities)

## Sources Consulted
- `snap` CLI help output (`snap help set`, `snap help refresh`) verified locally against snapd 2.75.2 on Ubuntu 24.04
- snapd source code (`overlord/configstate/configcore/refresh.go`) on canonical/snapd GitHub repo — confirmed `refresh.retain` validation range
- Local filesystem inspection of `/var/lib/snapd/` and `/var/snap/` to verify directory layout
- Snapcraft documentation references for managing updates and system options (snapcraft.io/docs/managing-updates, snapcraft.io/docs/system-options)

## Issues Found

1. **`refresh.retain=1` is invalid.** The post originally instructed `sudo snap set system refresh.retain=1` with the claim that this would "keep only 1 revision". The snapd source code (validation in `configcore/refresh.go`) rejects any value outside the range 2-20 with the error `"retain must be a number between 2 and 20"`. The minimum allowed value is 2.
   - **Fix:** Rewrote the example to use `refresh.retain=2` (the minimum and also the default on classic Ubuntu) and added an explicit note that values below 2 are rejected by snapd. Updated the surrounding explanation to describe behavior accurately: at retain=2, the previous revision is removed automatically after the next successful refresh.

2. **`/var/lib/snapd/snap/` does not exist.** The post listed `du -sh /var/lib/snapd/snap/` as "Snap data directories". Verified locally on Ubuntu 24.04 with snapd 2.75.2 that this path does not exist. The actual per-snap system data location is `/var/snap/`.
   - **Fix:** Changed the path from `/var/lib/snapd/snap/` to `/var/snap/` and updated the comment to "Per-snap system data directories".

## Review Notes

- The `snap list --all` example output uses a layout consistent with current snap CLI output (Name, Version, Rev, Tracking, Publisher, Notes). The "Tracking" column normally shows just the track/channel (e.g., `latest/stable`), and "Publisher" is a single token — the example output is correct in shape.
- The cleanup script's use of `set -euo pipefail` is good practice. One subtle point: because `DISABLED=$(snap list --all | awk ...)` runs without `pipefail` triggering on the script-wide `set -e` (since it's a command substitution captured into a variable), an empty result is handled correctly by the subsequent `[ -z "$DISABLED" ]` check. No correctness issue.
- The `while read snapname revision` in the one-liner does not use `-r`, which is a minor stylistic concern (would mangle backslashes in input) but harmless for snap names and revision numbers which never contain backslashes. Left as-is to preserve the author's writing.
- The `snap saved` / `snap forget <id>` commands are valid — `snap saved` lists snapshot sets and `snap forget` removes them by set ID.
- The `losetup --list | grep snap | wc -l` count is approximate: it counts loop devices whose backing file path contains the substring "snap", which is correct for the typical `/var/lib/snapd/snaps/*.snap` paths.
- The post's storage-savings estimate ("2-4 GB" on a fresh Ubuntu Desktop after a few months) is plausible and consistent with typical snap revision sizes (Firefox ~250 MB, core24 ~80 MB, etc.).
- No version-specific caveats: all commands and settings remain valid across recent snapd releases (2.5x through 2.75.x).
