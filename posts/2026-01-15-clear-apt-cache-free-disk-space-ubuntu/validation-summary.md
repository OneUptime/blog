# Validation Summary: How to Clear APT Cache and Free Disk Space on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- APT package manager (`apt clean`, `apt autoclean`, `apt autoremove`, `apt purge`)
- dpkg package querying
- systemd journald (`journalctl --vacuum-*`, `journald.conf`)
- Linux kernel package management (`linux-image-*`, `linux-headers-*`)
- snapd (snap revisions, `refresh.retain`)
- Docker (`docker system prune`, `docker image/container/volume prune`)
- Flatpak (`flatpak uninstall --unused`)
- Coreutils / findutils (`df`, `du`, `find`, `truncate`, `ncdu`, `fdupes`)
- cron / crontab scheduling

## Sources Consulted
- apt(8) and apt-get(8) man pages — https://manpages.ubuntu.com/manpages/jammy/man8/apt.8.html
- journalctl(1) man page (vacuum options) — https://www.freedesktop.org/software/systemd/man/journalctl.html
- journald.conf(5) man page — https://www.freedesktop.org/software/systemd/man/journald.conf.html
- snap CLI docs (`snap set system refresh.retain`) — https://snapcraft.io/docs/managing-disk-space
- docker system prune / image prune docs — https://docs.docker.com/reference/cli/docker/system/prune/
- flatpak(1) uninstall docs — https://docs.flatpak.org/en/latest/flatpak-command-reference.html
- find(1), du(1), truncate(1), head(1) GNU coreutils/findutils man pages

## Issues Found
- **journald `--vacuum-files=100` mislabeled.** The comment read "Keep only last 100 entries". Per the `journalctl` man page, `--vacuum-files=` limits the number of journal *files* retained, not the number of log entries. Changed the comment to "Keep only the last 100 journal files" to accurately describe the flag's behavior.

## Review Notes
- All other commands were verified as syntactically correct and current: `apt clean`/`autoclean`/`autoremove` (including `--purge`, `--dry-run`), residual-config purge via `dpkg -l | grep '^rc'`, kernel listing/removal, `journalctl --vacuum-time/--vacuum-size`, journald.conf keys (`SystemMaxUse`, `SystemMaxFileSize`, `MaxRetentionSec`), snap disabled-revision removal, Docker prune commands, Flatpak unused removal, `fdupes -rd`, and the cron schedules.
- `head -n -2` (GNU head, prints all but the last N lines) correctly keeps the two newest kernels; relies on GNU coreutils, which is standard on Ubuntu.
- `df / | awk 'NR==2 {print int($5)}'` correctly strips the trailing `%` from the Use% column because `int()` parses the leading digits — works as intended.
- `/etc/apt/apt.conf.d/10periodic` is a valid location for the `APT::Periodic::AutocleanInterval` setting; apt reads all fragment files in `apt.conf.d/`, so `20auto-upgrades` would also work.
- The disk-alert script depends on `mailutils`/a configured MTA for `mail`; this is implied but not stated. Not a correctness error, just an environment prerequisite.
- Destructive commands (`rm -rf ~/.cache/*`, `truncate -s 0 /var/log/...`, `docker system prune -a --volumes`) are appropriately scoped, and the post already warns against removing the running kernel.
