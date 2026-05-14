# Validation Summary: How to Take and Restore Stratis Snapshots on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Stratis
- XFS
- Linux mount and umount commands
- cron
- Bash

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Using snapshots on Stratis file systems": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems#using-snapshots-on-stratis-file-systems
- Red Hat Enterprise Linux 9 documentation, "Mounting a Stratis file system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems#mounting-a-stratis-file-system
- Red Hat Enterprise Linux 9 documentation, "Setting up non-root Stratis file systems in /etc/fstab using a systemd service": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems#setting-up-non-root-stratis-file-systems-in-etc-fstab-using-a-systemd-service
- stratis(8) man page for stratis-cli command syntax: https://www.mankier.com/8/stratis

## Issues Found
- The post claimed that Stratis does not have a direct restore command and recommended swapping filesystems for complete restoration. RHEL 9 documentation now describes `stratis filesystem schedule-revert` and `stratis filesystem cancel-revert` for reverting a filesystem to a previous snapshot. I changed Option B to use the documented scheduled revert flow and pool restart sequence.
- The persistent mount note referred to updating `/etc/fstab` with the UUID of a newly swapped filesystem. Because the corrected revert flow keeps the original filesystem name and RHEL documents Stratis-specific systemd dependencies for persistent mounts, I updated the note to use the current filesystem device and mention the Stratis dependency.
- The full copy restore example mounted `/mnt/snap-source` without creating it first. I added `sudo mkdir -p /mnt/snap-source /documents` before mounting.
- The monitoring example used `stratis pool list datapool`, but the Stratis CLI syntax filters a named pool with `--name`. I changed it to `stratis pool list --name datapool`.

## Review Notes
The local environment does not have `stratis` installed, so CLI behavior was verified against Red Hat documentation and the stratis(8) command reference rather than by executing Stratis commands locally.
