# Validation Summary: How to Install and Configure Forgejo Git Server on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Forgejo Git server
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Git and Git LFS
- systemd
- firewalld
- SELinux troubleshooting

## Sources Consulted
- Forgejo official installation from binary documentation: https://forgejo.org/docs/latest/admin/installation/binary/
- Forgejo official download page and GPG verification instructions: https://forgejo.org/download/
- Red Hat Enterprise Linux 9 DNF documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Red Hat Enterprise Linux 9 firewalld documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/configuring_firewalls_and_packet_filters/Red_Hat_Enterprise_Linux-9-Configuring_firewalls_and_packet_filters-en-US.pdf

## Issues Found
- The original install command used `sudo dnf install -y <package-name>`, which was a placeholder and would not install Forgejo or its dependencies. Replaced it with concrete RHEL package installation for `git`, `git-lfs`, `wget`, `gnupg2`, and `firewalld`, plus official Forgejo binary download, signature verification, and installation commands.
- The original service configuration used `/etc/<service>/config.conf`, which is not Forgejo's configuration path. Replaced it with `/etc/forgejo/app.ini`, the path used by the official Forgejo binary installation.
- The original service management commands used `<service-name>`, which would not work. Replaced them with `forgejo.service`.
- The original guide omitted the required `git` system user and Forgejo data/config directories. Added the official Red Hat-derivative user creation command and the required `/var/lib/forgejo` and `/etc/forgejo` directory setup.
- The original guide omitted installing the Forgejo systemd unit and reloading systemd. Added the official service file download and `systemctl daemon-reload` command.
- The original firewall example used `<PORT>/tcp`, which did not identify Forgejo's default web port. Replaced it with `3000/tcp` and noted that SSH Git access usually uses the server's SSH port.
- Verification and troubleshooting examples used placeholders for service and package names. Replaced them with Forgejo-specific commands.

## Review Notes
The post now follows the official Forgejo binary installation flow for Red Hat-derived systems. Future updates should refresh the `FORGEJO_VERSION` value and matching download URLs when a newer Forgejo release is selected.
