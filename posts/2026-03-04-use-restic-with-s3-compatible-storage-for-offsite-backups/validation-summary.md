# Validation Summary: How to Use Restic with S3-Compatible Storage for Offsite Backups on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- DNF / RPM package management
- EPEL
- Restic
- S3-compatible object storage
- Linux shell commands

## Sources Consulted
- Restic documentation: Preparing a new repository, including S3 and S3-compatible backends: https://restic.readthedocs.io/en/latest/030_preparing_a_new_repo.html
- Restic manual, including `init`, `backup`, `snapshots`, `check`, `forget`, `prune`, `RESTIC_REPOSITORY`, and `RESTIC_PASSWORD`: https://restic.readthedocs.io/en/stable/manual_rest.html
- Red Hat documentation for RHEL software management with DNF/YUM: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/8/epub/installing_managing_and_removing_user-space_components/
- Red Hat Customer Portal guidance for EPEL on RHEL: https://access.redhat.com/solutions/3358
- Red Hat blog guidance for enabling EPEL and CodeReady Builder on RHEL: https://www.redhat.com/en/blog/install-epel-linux

## Issues Found
- The original post used placeholder commands such as `dnf install -y <package-name>`, `systemctl enable --now <service>`, `<service> --test`, and `firewall-cmd --add-service=<service>`. These would not work for Restic. Replaced them with concrete Restic installation, configuration, initialization, backup, snapshot, check, and retention commands.
- The original post treated Restic as a long-running system service. Restic is a command-line backup tool and does not provide a generic `<service>` unit by default. Replaced service-management steps with direct Restic commands.
- The original package preparation step installed generic development tools, which are not required for installing the Restic package. Replaced it with EPEL and CodeReady Builder setup appropriate for RHEL 8 or 9.
- The original firewall section implied an inbound firewall service should be opened. Restic backups to S3-compatible storage use outbound connections to the object-storage endpoint. Updated the section to explain outbound connectivity and removed the invalid `firewall-cmd --add-service=<service>` command.
- The original verification and troubleshooting steps referred to generic service logs and test commands. Replaced them with `restic snapshots`, `restic check`, and S3 credential/repository checks.

## Review Notes
The corrected post covers a manual Restic workflow. A future improvement could add a systemd timer or cron example for scheduled backups, but that was outside the scope of this technical correction.
