# Validation Summary: How to Create systemd Path Units for File System Monitoring on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- systemd path units
- systemd service units
- Bash shell scripting
- Linux file permissions and service users

## Sources Consulted
- systemd.path manual: https://www.freedesktop.org/software/systemd/man/252/systemd.path.html
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings
- Local systemd.path(5), systemd.service(5), systemctl(1), useradd(8), and install(1) manual/help output

## Issues Found
- The `DirectoryNotEmpty=` example comment said it triggered when any file changed in the directory. According to `systemd.path(5)`, `DirectoryNotEmpty=` activates the configured unit when the directory contains at least one file, including immediately when the path unit starts and the directory is already non-empty. Updated the comment to describe this accurately.
- The service runs as `User=processor` and `Group=processor`, but the setup commands did not create that account or grant it write access to `/var/spool/incoming` and `/var/spool/processed`. Added `useradd` and `install -d` commands so the oneshot service can move files as the intended unprivileged user.

## Review Notes
The path unit directives and `Unit=` behavior match the systemd documentation. `PathChanged=` and `PathModified=` have subtly different write-trigger semantics; the post's short directive table is broadly correct, but a future expansion could explain that `PathChanged=` fires when a file opened for writing is closed, while `PathModified=` also fires on simple writes.
