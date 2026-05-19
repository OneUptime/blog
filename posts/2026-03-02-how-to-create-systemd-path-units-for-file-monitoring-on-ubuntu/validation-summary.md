# Validation Summary: How to Create systemd Path Units for File Monitoring on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu
- systemd path units
- systemd service units
- systemctl
- journalctl
- Bash scripting

## Sources Consulted
- systemd.path(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.path.html
- systemd.unit(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- systemd.service(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html
- systemd.exec(5), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html
- systemctl(1), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemctl.html
- systemd-analyze(1), official systemd documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd-analyze.html

## Issues Found
- The introduction said path units provide automatic restart on failure. I changed this to start rate limiting because path units activate triggered units from path conditions and systemd applies rate limiting, but a path unit is not a general service restart policy.
- The event descriptions for `PathChanged`, `PathModified`, and `DirectoryNotEmpty` were too broad. I updated them to match `systemd.path(5)`: `PathChanged` reacts when an open-for-writing file is closed, `PathModified` also reacts to simple writes, and `DirectoryNotEmpty` is true whenever the directory contains at least one file.
- The setup commands ran the processor as `www-data` but wrote logs under `/var/log` without making the log file writable by that user. I added `touch` and `chown` commands for `/var/log/upload-processor.log`.
- The enable instructions included `sudo systemctl enable process-uploads.service`, but the example oneshot service has no `[Install]` section and should be activated by the path unit. I removed that command.
- The `PathExistsGlob` note implied activation only when a matching path appears. I updated it to clarify that activation is based on whether at least one matching path exists, while modifications to existing matching files are not watched by `PathExistsGlob`.
- The rate-limiting example placed `StartLimitIntervalSec=` and `StartLimitBurst=` under `[Service]`. These are unit-level settings documented in `systemd.unit(5)`, so I moved them under `[Unit]`.

## Review Notes
The examples are otherwise consistent with current systemd behavior on Ubuntu systems using modern systemd releases. Path units use inotify internally, so they inherit inotify limitations such as unreliable monitoring of changes made by other machines on remote NFS filesystems; that caveat could be useful in a future expansion.
