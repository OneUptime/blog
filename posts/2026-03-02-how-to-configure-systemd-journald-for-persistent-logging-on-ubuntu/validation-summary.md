# Validation Summary: How to Configure systemd-journald for Persistent Logging on Ubuntu

## Status
validated

## Post Type
Tutorial / system administration guide

## Technologies Covered
- Ubuntu
- systemd-journald
- journalctl
- journald.conf
- systemd drop-in configuration files
- rsyslog/syslog forwarding
- Forward Secure Sealing (FSS)

## Sources Consulted
- systemd journald.conf official documentation: https://www.freedesktop.org/software/systemd/man/journald.conf.html
- systemd journalctl official documentation: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd-journald.service official documentation: https://www.freedesktop.org/software/systemd/man/systemd-journald.service.html
- systemd.exec official documentation for per-unit log rate limits: https://www.freedesktop.org/software/systemd/man/systemd.exec.html
- systemd-journal-remote official documentation: https://www.freedesktop.org/software/systemd/man/systemd-journal-remote.service.html
- Local Ubuntu systemd 255.4 man pages and command help for journald.conf(5), journalctl(1), systemd-journald.service(8), systemd.exec(5), systemd-analyze, systemd-tmpfiles, and systemd-analyze timespan.

## Issues Found
- Clarified volatile versus persistent storage behavior. `Storage=auto` uses persistent storage only when `/var/log/journal/` exists, while `Storage=persistent` can create the directory when needed and falls back to runtime storage during early boot or when `/var` is not writable.
- Corrected the permission comment for `chmod 2755 /var/log/journal`: mode `2755` sets the setgid bit, not the sticky bit.
- Corrected the `systemd-tmpfiles` comment. The command applies the packaged ownership, mode, and ACL rules for `/var/log/journal`; it is not what forces journald to recognize the directory.
- Corrected `SystemMaxFiles` wording. The option limits the number of journal files, not the number per user.
- Removed the package-update overwrite claim around editing `/etc/systemd/journald.conf` and kept the accurate recommendation to use drop-ins.
- Corrected the sample `journalctl --list-boots` dates. The original example included invalid/inconsistent dates, including February 29, 2026.
- Added the `--verify-key` caveat for Forward Secure Sealing. `journalctl --verify` checks consistency, but FSS authenticity verification requires the verification key.
- Corrected the export/import example. `journalctl --file` reads native journal files, not `journalctl -o export` streams; exported streams need conversion back to native journal format with `systemd-journal-remote` before viewing with `journalctl --file`.

## Review Notes
The remaining commands and configuration keys are valid for current Ubuntu systemd 255 behavior. Some examples depend on installed services or packages, such as rsyslog for `/var/log/syslog` forwarding checks and systemd-journal-remote for converting export streams.
