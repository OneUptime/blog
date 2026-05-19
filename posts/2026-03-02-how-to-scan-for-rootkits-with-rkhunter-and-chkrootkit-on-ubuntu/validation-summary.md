# Validation Summary: How to Scan for Rootkits with rkhunter and chkrootkit on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (apt-get package management)
- rkhunter (Rootkit Hunter)
- chkrootkit
- Bash scripting
- cron / cron.d for automated scheduling
- mail / mailx for email notifications
- avml (Microsoft memory acquisition tool, LiME format)
- ss, ip, netstat, lsmod (Linux system inspection tools)

## Sources Consulted
- Upstream rkhunter configuration file (defaults & directive spellings): https://sourceforge.net/p/rkhunter/rkh_code/ci/master/tree/files/rkhunter.conf
- rkhunter project page: https://sourceforge.net/projects/rkhunter/
- chkrootkit script source (option parsing, test names, `chk_cron`): https://raw.githubusercontent.com/Magentron/chkrootkit/master/chkrootkit
- chkrootkit project page: http://www.chkrootkit.org/
- rkhunter(8) and chkrootkit(8) man pages

## Issues Found
1. **Incorrect rkhunter config directive spelling.** The post used `MAIL_ON_WARNING=admin@example.com`. The correct directive in `rkhunter.conf` uses hyphens: `MAIL-ON-WARNING`. (Note: `MAIL_CMD` does use underscores — rkhunter is inconsistent here.) Fixed in the configuration block.
2. **`chkrootkit --version` is not supported.** chkrootkit only accepts the short form `-V` for version output (per the script's option-parsing case statement). Changed `chkrootkit --version` → `chkrootkit -V` in the install verification step.
3. **Misleading comment on `ROTATE_MIRRORS`.** The original comment read "Rotate log file", which is incorrect — `ROTATE_MIRRORS` controls rotation of entries in `mirrors.dat` so a different mirror is tried first on each `--update`. Rewrote the comment to describe the directive accurately.
4. **Misleading description of the chkrootkit `cron` test.** The post described it as "check cron for rootkit entries", implying it scans crontab files. The `chk_cron()` function actually inspects the cron binary itself with `strings` for known rootkit signatures (e.g., `/dev/hda`, `/dev/hdc0`). Updated the comment to reflect what the test really does.

## Review Notes
- `ALLOWPROCDELFILE=/lib/udev/udevd` is shown as an example. On modern Ubuntu (systemd-based, 16.04+) the udev daemon binary is typically `/lib/systemd/systemd-udevd`, so the literal path in the example may not match a real warning on a current system — but the directive name and syntax are correct, and the path used is exactly the example shipped historically in `rkhunter.conf`. Left as-is since the focus is showing the directive shape.
- `netstat -tlnp` (in the bindshell false-positive note) is provided by `net-tools`, which is no longer installed by default on modern Ubuntu. `ss -tlnp` is the modern equivalent. Not changed since `netstat` is still widely understood, but readers on minimal images may need to install `net-tools` or substitute `ss`.
- `chkrootkit -r /mnt/suspect-system/` is documented correctly; on a mounted disk for offline forensics, also pass `-p /known/good/binaries` if you want chkrootkit to use trusted utilities from a clean reference rather than the suspect mount — outside the scope of this intro guide.
- The `--propupd` guidance is correct and appropriately warns against running it on a possibly-compromised system. Good security hygiene callout retained as-is.
