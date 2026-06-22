# Validation Summary: How to Hold and Unhold Packages on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (18.04+)
- APT / apt-mark
- dpkg (`--set-selections` / `--get-selections`)
- aptitude
- APT preferences / pinning (`/etc/apt/preferences.d/`)
- unattended-upgrades
- Synaptic Package Manager
- Linux kernel package management (linux-image / linux-headers / linux-modules)
- cron

## Sources Consulted
- apt-mark man page (hold, unhold, showhold) — https://manpages.ubuntu.com/manpages/jammy/en/man8/apt-mark.8.html
- dpkg man page (`--set-selections`, `--get-selections`) — https://manpages.ubuntu.com/manpages/jammy/en/man1/dpkg.1.html
- apt_preferences man page (pin priorities) — https://manpages.ubuntu.com/manpages/jammy/en/man5/apt_preferences.5.html
- aptitude search reference (`~ahold` action term) — https://www.debian.org/doc/manuals/aptitude/ch02s04s05.en.html
- crontab(5) man page — system crontab (`/etc/crontab`) field format — https://manpages.ubuntu.com/manpages/jammy/en/man5/crontab.5.html
- unattended-upgrades documentation (`Package-Blacklist`) — https://wiki.debian.org/UnattendedUpgrades

## Issues Found
- **Missing user field in `/etc/crontab` entry (Add to Cron section).** The original entry was `0 9 * * 1 /home/user/check-held-packages.sh | mail ...`. Entries written to the system-wide `/etc/crontab` require a user field after the day-of-week field (`m h dom mon dow USER command`), unlike per-user crontabs created with `crontab -e`. As written, cron would interpret the script path as the username and the line would fail. Fixed by inserting a `root` user field and adding a clarifying comment.

## Review Notes
- The `apt-mark`, `dpkg --set-selections`, and `aptitude` hold/unhold commands are all correct and current.
- The kernel package names (`linux-image-`, `linux-headers-`, `linux-modules-`, `linux-modules-extra-` with `$(uname -r)`) are accurate for modern Ubuntu releases.
- The Pin Priority table is a reasonable simplification of `apt_preferences(5)`. The official man page treats the 500–990 and 990–1000 bands with similar wording ("installed unless there is a version belonging to the target release or the installed version is more recent"); the table's phrasing ("held or newer available" for 990–1000) is a slight simplification but not misleading. Left as-is since it conveys the practical effect correctly.
- `Unattended-Upgrade::Package-Blacklist` is the correct directive name in `50unattended-upgrades`.
- The monitoring script's use of `dpkg -l ... awk '{print $3}'` (version column) and `apt-cache policy ... Candidate:` is correct.
- Synaptic's Package → Lock Version workflow is accurate.
