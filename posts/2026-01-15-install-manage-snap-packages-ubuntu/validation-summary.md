# Validation Summary: How to Install and Manage Snap Packages on Ubuntu

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Snap / snapd (universal Linux package format)
- Ubuntu
- APT (referenced for comparison)
- systemd (snapd service management)

## Sources Consulted
- Snap documentation — Manage updates (covers `refresh.timer`, `refresh.hold`, `refresh.retain`): https://snapcraft.io/docs/how-to-guides/manage-snaps/manage-updates/
- Snap documentation — Managing updates / overview: https://snapcraft.io/docs/managing-updates
- General knowledge of the `snap` CLI (`install`, `find`, `info`, `list`, `remove`, `switch`, `refresh`, `connections`, `connect`/`disconnect`, `services`, `start`/`stop`/`restart`, `logs`, `aliases`, `revert`, `changes`, `enable`/`disable`)

## Issues Found
No technical issues found.

Notable verification: The post states "Snaps keep 2 revisions by default" (`refresh.retain=2`). This was checked carefully because snapd's default differs by system type. The official Snap documentation confirms the default is `refresh.retain=2` on **classic Ubuntu** systems (and `3` on Ubuntu Core). Since this post specifically targets Ubuntu, the claim is correct as written. The valid range (2–20) is also consistent with the example.

## Review Notes
- All `snap` CLI commands, flags, and channel names (stable/candidate/beta/edge) are accurate and current.
- The `refresh.timer` examples (`00:00~24:00/4` for four times daily, `mon,04:00` for a specific time) use valid timer syntax, and "4 times daily by default" matches snapd's default behavior.
- The `refresh.hold` example using an ISO-8601 timestamp is valid; note that newer snapd versions allow holding indefinitely via `snap refresh --hold`, which could be mentioned as an alternative in the future, but the documented `snap set system refresh.hold=<time>` approach remains correct.
- The awk one-liner for removing disabled revisions correctly references the `Rev` column (`$3`) from `snap list --all` output and the `disabled` note.
- "Snap is pre-installed on 18.04+" is accurate; snapd has shipped by default on Ubuntu Desktop since 16.04, and the wording here is conservative and correct.
- No version-specific information is outdated.
