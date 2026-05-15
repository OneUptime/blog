# Validation Summary: How to Manage systemd-nspawn Containers with machinectl on RHEL

## Status
validated

## Post Type
Tutorial / command guide

## Technologies Covered
- RHEL
- systemd-nspawn
- machinectl
- systemd-machined
- journalctl
- systemd-cgtop

## Sources Consulted
- systemd machinectl manual: https://www.freedesktop.org/software/systemd/man/latest/machinectl.html
- systemd 252 machinectl manual, matching RHEL 9-era systemd behavior for image transfer commands: https://www.freedesktop.org/software/systemd/man/252/machinectl.html
- systemd journalctl manual: https://www.freedesktop.org/software/systemd/man/latest/journalctl.html
- systemd-cgtop manual: https://www.freedesktop.org/software/systemd/man/latest/systemd-cgtop.html
- Red Hat Customer Portal note on systemd-nspawn availability/support context: https://access.redhat.com/solutions/1533893

## Issues Found
- The introduction described machinectl only as the management interface for systemd-nspawn containers. Updated it to clarify that machinectl controls the systemd machine manager and can manage systemd-nspawn containers.
- The post said containers must be stored under `/var/lib/machines/`. Updated this to "preferably stored" because machinectl also searches other supported image paths and can use symlinks into `/var/lib/machines/`.
- The resource usage section used `machinectl list` to show resource usage. Replaced that example with `systemd-cgtop`, which is the systemd tool for live control-group resource usage. Kept `machinectl status` for detailed status and cgroup information.

## Review Notes
- `machinectl import-tar` and `export-tar` are valid in systemd 252, which is relevant to RHEL 9. In newer upstream systemd releases, image import/export functionality is documented under `importctl`, so future updates may need a version-specific note if the article targets newer RHEL releases.
