# Validation Summary: How to Verify Security Hardening with Lynis on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Lynis (security auditing tool)
- Ubuntu (Debian-based Linux)
- APT package manager and CISOfy software repository
- systemd (for service management)
- auditd, acct (process accounting and audit logging)
- sysctl, /proc, /etc/security/limits.conf (kernel/security tuning)
- cron (scheduled audits)
- Bash scripting

## Sources Consulted
- Lynis getting-started documentation: https://cisofy.com/documentation/lynis/get-started/
- Lynis general documentation (status indicators): https://cisofy.com/documentation/lynis/
- CISOfy community packages repository: https://packages.cisofy.com/community/
- Lynis control KRNL-5820 (core dumps): https://cisofy.com/lynis/controls/KRNL-5820/
- Lynis kernel test sources: https://github.com/CISOfy/lynis/blob/master/include/tests_kernel

## Issues Found
- **Incorrect status indicator symbols**: The original post described Lynis output status indicators as `[+]`, `[-]`, `[!]`, `[?]`, `[ ]`. Lynis does not use these single-character symbols. Per the official Lynis documentation, status results appear as bracketed words such as `[ OK ]`, `[ WARNING ]`, `[ FOUND ]`, `[ NOT FOUND ]`, `[ SUGGESTION ]`, `[ DONE ]`, `[ SKIPPED ]`, and `[ NONE ]`. I replaced the misleading symbol list with the actual descriptive bracket labels that Lynis prints.

## Review Notes
- The CISOfy installation snippet uses the modern `signed-by=/usr/share/keyrings/...` pattern (rather than the deprecated `apt-key add`), which matches current Debian/Ubuntu best practice and is actually more up-to-date than some of CISOfy's own published examples that still use `/etc/apt/trusted.gpg.d/`. Either keyring path works; the post's choice is fine.
- The leading `sudo` on `wget -O -` is redundant (downloading a public file does not need root), but the pipeline functions correctly because the subsequent `sudo gpg --dearmor` writes to the privileged keyring path. Not a correctness issue.
- The example test ID `KDUMP-7070` for disabling Apport is plausible — Lynis groups kdump/crash-dump related checks under `KDUMP-*` IDs — but the most canonical core-dump test in Lynis is `KRNL-5820`. The example reads as illustrative rather than a strict reference, so no change was needed.
- The summary block's `[V]` / `[X]` markers for component presence/absence match what Lynis actually prints in the Components section.
- `lynis show version`, `lynis show details <TEST-ID>`, `--quiet`, `--report-file`, and `/var/log/lynis-report.dat` are all correct.
- `fs.suid_dumpable=0`, `hidepid=2`, `acct` package + `acct.service`, and `auditd` package + service are all valid for current Ubuntu releases.
- The cron schedule string `0 0 * * 0 root /usr/local/bin/lynis-audit.sh` is the correct format for a system crontab entry under `/etc/cron.d/`.
