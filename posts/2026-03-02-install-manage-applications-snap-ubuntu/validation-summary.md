# Validation Summary: How to Install and Manage Applications with Snap on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Snap (snapd) package manager
- Ubuntu
- systemd (snapd service management)
- Snap channels and tracks (e.g., Kubernetes version tracks)
- Snap interfaces / connections (sandbox permissions)
- Snap snapshots / configuration / services

## Sources Consulted
- Snap documentation – Manage updates: https://snapcraft.io/docs/how-to-guides/manage-snaps/manage-updates/
- Snap documentation – System options (refresh.timer, refresh.hold, refresh.retain): https://snapcraft.io/docs/reference/administration/system-options/
- Snap documentation – Timer string format: https://snapcraft.io/docs/reference/administration/timer-string-format/
- Snap documentation – Control services: https://snapcraft.io/docs/how-to-guides/manage-snaps/control-services/
- Ubuntu manpage for `snap`: https://manpages.ubuntu.com/manpages/focal/en/man8/snap.8.html

## Issues Found
1. **Invalid `--hold` duration unit (`60d`)** — The `snap refresh --hold` flag accepts only Go duration units (`h`, `m`, `s`). `60d` is not parseable. Changed the example to `--hold=1440h` and added a note explaining the accepted format.
2. **Non-existent `snap find --publisher` flag** — `snap find` does not support a `--publisher` flag; supported flags are `--private`, `--narrow`, `--section`, `--color`, `--unicode`. Replaced the example with `snap find --section=games`, which is a real filtering option.
3. **Contradictory `snap remove --purge` comments** — The first comment claimed `--purge` *saves* a snapshot, while the subsequent comment correctly stated it *skips* the snapshot. Rewrote both comments to consistently and correctly describe the default behavior (snapshot saved) versus `--purge` (no snapshot).

## Review Notes
- All other commands and flags were verified against the official snap docs and are accurate (including `snap revert --revision`, `refresh.retain=2` as the minimum, `refresh.hold="forever"`, the four-times-per-day default refresh, `snap start --enable` / `snap stop --disable`, and the two `refresh.timer` syntaxes shown).
- The 60-day arbitrary hold value is fine; just be aware the *system-wide* `refresh.hold` setting (RFC 3339 timestamp form) is capped at 90 days, while `snap refresh --hold` without a duration defaults to `forever`.
- Snap revisions shown in example output (e.g., `core20` rev 2182, `vlc` 3.0.20 rev 3078) are illustrative and naturally drift over time — they are reasonable representative values, not problems.
- The example for cleaning up old revisions correctly relies on `LANG=en_US.UTF-8` to keep the `awk` parsing stable; this is the documented Canonical-recommended pattern.
