# Validation Summary: How to Configure Rootkit Detection with rkhunter on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- rkhunter (Rootkit Hunter) on Ubuntu
- `/etc/rkhunter.conf` configuration directives
- chkrootkit, AIDE, Lynis, OSSEC, Fail2Ban (complementary tools)
- cron and systemd timers for scheduling
- Bash scripting for automation and incident response
- mailutils / postfix for email notifications

## Sources Consulted
- rkhunter(8) man page (Ubuntu jammy): https://manpages.ubuntu.com/manpages/jammy/man8/rkhunter.8.html
- rkhunter(8) man page (linux.die.net): https://linux.die.net/man/8/rkhunter
- Authoritative default `rkhunter.conf` (crunchsec/rkhunter, the maintained fork): https://raw.githubusercontent.com/crunchsec/rkhunter/master/files/rkhunter.conf
- Rootkit Hunter config reference (Fossies mirror) and SourceForge documentation for `SCANROOTKITMODE` / `UPDT_ON_OS_CHANGE`

## Issues Found
The installation steps, scan commands, test categories (`rootkits`, `trojans`, `network`, `ports`), version number (1.4.6), and most directive names were correct. However, the large annotated `rkhunter.conf` reference contained several inaccuracies — mostly explanatory comments attached to the wrong directive, plus a few directives that do not exist. These were corrected:

1. **`SYSLOG_PRIORITY` — not a real directive.** Removed it. Its companion comment incorrectly described `USE_SYSLOG` as "verbose logging / Set to 1 for troubleshooting"; `USE_SYSLOG` actually sets the syslog `facility.priority` for logging scan start/finish and warnings — comment corrected.
2. **`AUTO_X_DETECT` comment was wrong.** It was described as "auto-update file properties database after system updates." It actually auto-detects whether the X window system is in use (to select the output colour set). Comment corrected.
3. **`HASH_FLD_IDX` comment was wrong.** Described as "alternative hash command (if primary unavailable)." It is the field index of the hash value in the `HASH_CMD` output. Comment corrected.
4. **`SCANROOTKITMODE` comment was wrong.** Described as "check for known bad applications." It controls whether rkhunter searches the whole filesystem for known rootkit filenames (THOROUGH mode). Comment corrected.
5. **`WARN_ON_OS_CHANGE` comment was wrong.** Described as "check for suspicious files in /dev directory." It warns when the O/S appears to have changed since the last `--propupd`. Comment corrected.
6. **`UPDT_ON_OS_CHANGE` comment was wrong/alarming.** Described as "upload rootkit samples (for security research)" — rkhunter does no such thing. It auto-runs `--propupd` on detected O/S change. Comment corrected.
7. **`PORT_PATH_WHITELIST` comment was wrong.** Described as "whitelist specific IP addresses." It whitelists listening ports by the program path (optionally `path:protocol:port`). Comment corrected.
8. **`IFACE_WHITELIST` — not a real directive.** Replaced with the real directive `ALLOWPROMISCIF` (whitelists interfaces allowed in promiscuous mode) and corrected the value/comment accordingly.
9. **`SYSLOG_CONFIG_FILE` comment was wrong.** Described as "system accounts that should not have login shells." It is the path to the syslog daemon config file used by the remote-logging check. Comment corrected.
10. **`IMMUTABLES_FILE` — not a real directive.** Removed it. Also clarified `IMMUTABLE_SET` (reverses the immutable-bit test).
11. **`GPGKEY` — not a real directive.** Removed it; tightened the `APP_WHITELIST` comment with a realistic example.
12. **`COPY_LOG_ON_ERROR` comment was imprecise** ("copy the logfile on each run"). It copies the log only when warnings/errors occur. Comment corrected.
13. **`--append-log` flag was incorrect.** The valid rkhunter option is `--appendlog` (no internal hyphen). Fixed in the daily-scan script.
14. **`/etc/crontab` entry missing the user field.** `echo "0 3 * * * /usr/local/bin/..." | sudo tee -a /etc/crontab` would fail because `/etc/crontab` (and `/etc/cron.d`) require a user column. Added `root`.
15. **Mislabeled cron block.** The crontab entries (no user field) were labeled `# /etc/cron.d/rkhunter`, which would require a user field and fail. Since the surrounding instruction uses `sudo crontab -e`, relabeled the block as root's crontab to match the format actually shown.

## Review Notes
- `MAIL-ON-WARNING` (hyphenated), `SHARED_LIB_WHITELIST`, `UID0_ACCOUNTS`, `PWDLESS_ACCOUNTS`, `ALLOWDEVFILE`, `OS_VERSION_FILE`, `APP_WHITELIST`, `PKGMGR=DPKG`, `HASH_CMD=SHA256`, `ENABLE_TESTS`/`DISABLE_TESTS`, and the `--enable all --disable none` idiom were all verified as valid against the default config and man page — left unchanged.
- The output colour description ("Green [OK] / Yellow [Warning] / Red [Warning]") is a reasonable simplification; rkhunter's actual result tags are `[ OK ]`, `[ Warning ]`, `[ Not found ]`, `[ None found ]`, and `[ Found ]`. Not changed as it is illustrative, not a command.
- Version 1.4.6 is still the current rkhunter release shipped in Ubuntu repositories; the source-install instructions and OSSEC 3.7.0 tarball URL are valid.
