# Validation Summary: How to Disable Snap Auto-Updates on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- snapd
- Snap package refreshes
- UFW
- Cron

## Sources Consulted
- Snap documentation: Manage updates - https://snapcraft.io/docs/how-to-guides/manage-snaps/manage-updates/
- Snap documentation: Refresh awareness - https://snapcraft.io/docs/explanation/how-snaps-work/refresh-awareness/
- Snap documentation: System options - https://snapcraft.io/docs/reference/administration/system-options/
- Snap documentation: Network requirements - https://snapcraft.io/docs/reference/administration/network-requirements/
- Local snap CLI help: `snap refresh --help`, `snap get --help`, `snap set --help`, `snap list --help`
- Local UFW CLI help: `ufw --help`

## Issues Found
- The post used `snap get firefox refresh.hold` to check an individual snap hold. `snap get` reads snap configuration, while the official hold documentation says held snaps appear in the `snap list` notes column. Changed the example to `snap list firefox`.
- The post described `sudo snap refresh firefox` as removing a hold and immediately updating. A targeted refresh can manually update a held snap, but it does not remove the hold. Updated the comment to say it manually updates a held snap.
- The post implied a local UFW rule could specifically block the Snap Store and prevent snap installation entirely. Snapd requires several HTTPS store and CDN endpoints, and a broad port 443 block also affects unrelated HTTPS traffic. Renamed the method and clarified that this is broad network blocking, not a snap-specific installation policy.
- The post claimed security-critical `snapd` and `core` updates may be forced through holds and that system snaps are excluded from user-defined holds. The official update documentation describes holds applying to installed snaps and does not document that exclusion. Reworded this section to recommend not holding snapd and base snaps for long periods because they carry security-sensitive infrastructure.
- The post simplified refresh behavior for services and desktop applications. Updated the wording to match refresh awareness documentation: services are stopped and started as part of refresh unless configured otherwise, and desktop app refreshes can be deferred while the app is running until closure or a deferral deadline.
- The cron/script snippet wrote directly to `/usr/local/sbin` and `/etc/cron.d` without privilege escalation and used `sudo` inside a root cron job. Updated the creation commands to use `sudo tee`/`sudo chmod` and removed unnecessary `sudo` from the script body.
- The security-update example used `snap info snapd | grep -A5 refresh`, which shows refresh metadata and channels rather than a pending update list. Changed it to check `snap refresh --list` for a pending `snapd` update.

## Review Notes
The main hold, unhold, refresh timer, refresh list, refresh retain, and cron examples are technically plausible. `snap refresh --hold` requires snapd 2.58 or later, so the post now notes that requirement for per-snap holds.
