# Validation Summary: How to Design a Disaster Recovery Plan for RHEL 9 Production Systems

## Status
validated

## Post Type
Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- Relax-and-Recover (ReaR)
- rsync
- PostgreSQL pg_dumpall
- tar
- Linux mdadm RAID
- Linux LVM

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation, "Recovering and restoring a system": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/assembly_recovering-and-restoring-a-system_configuring-basic-system-settings
- Red Hat Enterprise Linux 9 documentation, "Managing storage devices": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/managing_storage_devices/Red_Hat_Enterprise_Linux-9-Managing_storage_devices-en-US.pdf
- Red Hat Enterprise Linux 9 documentation, "Configuring and managing logical volumes": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_managing_logical_volumes/configuring_and_managing_logical_volumes
- Relax-and-Recover User Guide, "Internal Backup with tar to NFS server": https://relax-and-recover.org/rear-user-guide/scenarios/netfs_nas.html
- Relax-and-Recover User Guide, "Example of BACKUP=NETFS": https://relax-and-recover.org/rear-user-guide/basics/backup_netfs.html
- PostgreSQL documentation, "pg_dumpall": https://www.postgresql.org/docs/current/app-pg-dumpall.html

## Issues Found
- The PostgreSQL backup command used `sudo -u postgres pg_dumpall > /backup/postgresql-full.sql`. The `pg_dumpall` command writes to standard output, but the shell redirection is performed by the invoking shell rather than by the `postgres` user or `sudo`, so it can fail when the current user cannot write to `/backup`. Changed it to pipe through `sudo tee` so the dump still runs as `postgres` while the output file is written with elevated privileges.
- The mdadm disk replacement example only added a new member. Red Hat's RHEL 9 RAID replacement procedure marks the failed member as failed, removes it, then adds the replacement. Updated the example to include `--fail`, `--remove`, and `--add` with `--manage`.
- The LVM example described `pvmove /dev/sdb /dev/sdc` as replacing a failed PV. Red Hat documents `pvmove` as a migration command for a still-readable PV and requires the destination PV to be initialized and added to the volume group before the move, followed by `vgreduce` to remove the old PV. Updated the example to clarify the still-readable case and include `pvcreate`, `vgextend`, `pvmove`, and `vgreduce`.

## Review Notes
The ReaR configuration is valid for a basic NETFS backup. In a production DR plan, consider also setting `OUTPUT_URL` so the rescue ISO is stored outside the failed host, and validate boot and recovery on representative replacement hardware.
