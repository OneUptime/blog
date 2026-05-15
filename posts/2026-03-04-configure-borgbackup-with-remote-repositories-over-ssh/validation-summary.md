# Validation Summary: How to Configure BorgBackup with Remote Repositories Over SSH on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- BorgBackup
- SSH
- firewalld
- DNF/RPM package management

## Sources Consulted
- BorgBackup installation documentation: https://borgbackup.readthedocs.io/en/stable/installation.html
- BorgBackup quick start and remote repositories documentation: https://borgbackup.readthedocs.io/en/stable/quickstart.html
- BorgBackup `borg check` command documentation: https://borgbackup.readthedocs.io/en/stable/usage/check.html
- BorgBackup `borg serve` command documentation: https://borgbackup.readthedocs.io/en/stable/usage/serve.html
- Red Hat EPEL guidance: https://access.redhat.com/solutions/3358
- firewalld `firewall-cmd` documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The original post used placeholders such as `<package-name>` and `<service>` instead of valid BorgBackup commands. Replaced them with `borgbackup` package installation, `borg --version`, `borg init`, `borg create`, `borg list`, and `borg check`.
- The original post treated BorgBackup as a long-running systemd service. Borg normally runs as a client command and starts `borg serve` over SSH for remote repositories, so the service-management commands were replaced with repository initialization and backup commands.
- The original firewall example attempted to add a generic service name. For Borg over SSH, the remote host needs SSH access, so the firewalld command was changed to `--add-service=ssh`.
- The original verification command used a nonexistent generic `--test` command. It was replaced with documented `borg list`, `borg check`, and direct SSH connectivity checks.
- The original security section recommended TLS/SSL, which is not the relevant transport security layer for Borg over SSH. It was changed to SSH key authentication, restricted SSH access, forced `borg serve` commands, and Borg key backup guidance.
- The troubleshooting section referred to generic service failures and port conflicts. It was updated to cover SSH connectivity, repository permissions, SELinux context checks, and missing remote Borg installation.

## Review Notes
BorgBackup distribution packages can lag behind upstream releases. On RHEL systems where `borgbackup` is not available in enabled repositories, administrators may need to enable the appropriate EPEL repository for their RHEL major version or use another installation method approved for their environment.
