# Validation Summary: How to Implement a 3-2-1 Backup Strategy for RHEL 9 Servers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- GNU tar
- rsync
- cron
- ReaR
- LVM snapshots
- dd
- SSH-based remote backup storage

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Managing file systems, including backup and restore guidance: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_file_systems/managing_file_systems
- Red Hat Enterprise Linux 9 documentation: Recovering and restoring a system with ReaR: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation: Configuring and managing logical volumes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Red Hat Enterprise Linux documentation: Automating system tasks with cron and `/etc/cron.d`: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/system_administrators_guide/ch-automating_system_tasks
- CISA data backup options guidance describing the 3-2-1 rule: https://www.cisa.gov/sites/default/files/publications/data_backup_options.pdf
- Local GNU tar help output (`tar --help`)
- Local rsync help output (`rsync --help`)

## Issues Found
- The original commands created only a local backup, so the implementation did not actually satisfy the 3-2-1 requirement for one off-site copy. I updated the prerequisites to require local storage and SSH access to an off-site destination, and added an rsync command that copies the local backup to a remote backup host.
- The tar verification and restore examples used `/backups/full-backup-*.tar.gz` directly. With more than one dated archive, shell expansion passes multiple paths to `tar`, causing only the first to be used as the archive and the rest to be interpreted as member names. I changed those examples to select the newest matching archive into `BACKUP_FILE` and pass that single file to `tar`.

## Review Notes
- The listed tools and command options are current and technically valid for RHEL 9-era systems. For production systems, future improvements could mention application-consistent backups for databases and services, and stronger restore testing than listing archive contents or checking a directory.
