# Validation Summary: How to Use ReaR (Relax-and-Recover) for Disaster Recovery on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Relax-and-Recover (ReaR)
- GNU tar
- rsync
- cron

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Recovering and restoring a system - https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- GNU tar command help from the local system: `tar --help`
- rsync command help from the local system: `rsync --help`

## Issues Found
- The post title and description promised a ReaR disaster recovery guide, but the implementation steps only showed generic `tar` and `rsync` backups. I replaced the backup creation flow with the RHEL 9 documented ReaR workflow: install `rear`, configure `/etc/rear/local.conf`, run `rear mkbackup`, schedule `/usr/sbin/rear mkbackup`, and test recovery with `rear recover`.
- The summary used lowercase `rear (relax-and-recover)`. I changed it to the proper project name, `ReaR (Relax-and-Recover)`.

## Review Notes
The example uses ReaR's built-in `NETFS` backup method with local `file://` URLs pointed at a mounted backup destination. Production deployments should choose backup and output locations that match the system's recovery plan and should test the generated rescue image before relying on it.
