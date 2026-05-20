# Validation Summary: How to Configure journald Log Compression on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- systemd-journald
- journalctl
- systemd unit timers
- cron

## Sources Consulted
- systemd journald.conf manual: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd Journal File Format documentation: https://systemd.io/JOURNAL_FILE_FORMAT/
- Local Ubuntu systemd 255 man pages for journald.conf(5), journalctl(1), systemd-analyze(1), and systemd.time(7)

## Issues Found
- The post described rotated journal files as "sealed (marked as complete)." In systemd terminology, sealing refers to Forward Secure Sealing when configured, while rotation marks files as archived. Updated the wording to say rotated and archived.
- The configuration check used `systemctl cat systemd-journald`, which shows the service unit rather than the effective journald configuration. Replaced it with `systemd-analyze cat-config systemd/journald.conf`, which is the documented command for displaying config files and drop-ins.
- The sample configuration set `SystemMaxFileSize` twice and described the second occurrence as the compression threshold. `SystemMaxFileSize` controls journal file rotation size; `Compress=` enables compression and can optionally be set to a byte threshold. Removed the duplicate setting and corrected the compression comment.
- The post described `SystemMaxFiles` as rotating after a number of journal files. The option limits how many journal files are kept, with cleanup applying to archived files. Updated the comment accordingly.

## Review Notes
The `journalctl --vacuum-*`, `--rotate`, `--disk-usage`, `--header`, and `--file` options are current for Ubuntu's systemd 255. Time values such as `3month`, `90day`, and `90d` parse correctly through systemd time-span handling.
