# Validation Summary: How to Install and Configure BorgBackup for Deduplicated Backups on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- DNF
- EPEL
- BorgBackup
- firewalld
- SSH

## Sources Consulted
- BorgBackup installation documentation: https://borgbackup.readthedocs.io/en/stable/installation.html
- BorgBackup `borg init` documentation: https://borgbackup.readthedocs.io/en/stable/usage/init.html
- BorgBackup `borg create` documentation: https://borgbackup.readthedocs.io/en/stable/usage/create.html
- BorgBackup `borg check` documentation: https://borgbackup.readthedocs.io/en/stable/usage/check.html
- BorgBackup `borg prune` documentation: https://borgbackup.readthedocs.io/en/stable/usage/prune.html
- BorgBackup `borg compact` documentation: https://borgbackup.readthedocs.io/en/stable/usage/compact.html
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Customer Portal EPEL guidance: https://access.redhat.com/solutions/3358

## Issues Found
- The post used placeholder package commands such as `dnf install -y <package-name>` and `rpm -qi <package-name>`. Replaced them with `borgbackup`, `borg --version`, and `rpm -qi borgbackup`.
- The EPEL setup used `dnf install -y epel-release`, which is not reliable on a base RHEL system unless an appropriate repository already provides that package. Replaced it with the Fedora EPEL release package URL using the local RHEL major version.
- The post treated BorgBackup as a systemd service with `/etc/<service>/config.conf`, `systemctl enable --now <service>`, and `<service> --test`. BorgBackup is a command-line backup tool, not a long-running service in the documented installation path. Replaced those commands with `borg init`, `borg create`, `borg list`, and `borg check`.
- The firewall example used `--add-service=<service>`, which is not a valid firewalld service for BorgBackup. Replaced it with an SSH example for remote Borg repositories, since Borg commonly uses SSH transport for remote storage.
- The performance tuning section used service process monitoring commands that do not apply to BorgBackup. Replaced them with Borg-supported compression, retention, prune, and compact commands.
- Security guidance mentioned TLS/SSL for the service, which does not match the Borg CLI/SSH workflow described in the post. Updated it to focus on repository encryption, passphrase/key handling, SSH restrictions, and package updates.
- Troubleshooting guidance referenced service startup and port conflicts. Updated it to cover repository access, filesystem/SELinux permissions, and SSH connectivity.

## Review Notes
The revised tutorial uses BorgBackup 1.x style commands because the current stable Borg documentation is 1.4.4 and EPEL packages for current RHEL-compatible releases may provide Borg 1.x. Borg 2.x has command-line differences, so future updates should re-check examples if the target RHEL/EPEL package line moves to Borg 2.x.
