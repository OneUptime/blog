# Validation Summary: How to Install and Configure Bacula Backup Server on RHEL

## Status
not-technically-relevant

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Bacula Backup Server
- DNF
- systemd
- firewalld
- SELinux troubleshooting commands

## Sources Consulted
- Red Hat Enterprise Linux 9 Package Manifest: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/pdf/package_manifest/Red_Hat_Enterprise_Linux-9-Package_manifest-en-US.pdf
- Red Hat Enterprise Linux 9, Managing software with the DNF tool: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/managing_software_with_the_dnf_tool/index
- Red Hat Enterprise Linux 9, Configuring basic system settings: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index
- Red Hat Enterprise Linux 9, Configuring firewalls and packet filters: https://docs.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/htmlsingle/configuring_firewalls_and_packet_filters/index
- Bacula documentation, Installing Bacula: https://www.bacula.org/7.4.x-manuals/en/main/Installing_Bacula.html
- Bacula documentation, Configuring the Director: https://bacula.org/13.0.x-manuals/en/main/Configuring_Director.html
- Bacula documentation, Client/File daemon configuration: https://www.bacula.org/13.0.x-manuals/en/main/Client_File_daemon_Configur.html
- Bacula Systems documentation, Security and permissions considerations: https://docs.baculasystems.com/BEInstallation/CommunityInstallation/SecurityAndPermissionsConsiderations/index.html

## Issues Found
- The article is a generic service-installation placeholder rather than a Bacula installation guide. It instructs readers to install `<package-name>` instead of real RHEL 9 Bacula packages such as `bacula-director`, `bacula-storage`, `bacula-client`, and `bacula-console`.
- The configuration path `/etc/<service>/config.conf` is not a valid Bacula configuration path. Bacula uses component-specific configuration files such as `/etc/bacula/bacula-dir.conf`, `/etc/bacula/bacula-sd.conf`, `/etc/bacula/bacula-fd.conf`, and `/etc/bacula/bconsole.conf`.
- The service commands use `<service-name>` instead of Bacula systemd units such as `bacula-dir.service`, `bacula-sd.service`, and `bacula-fd.service`.
- The firewall command uses `<PORT>` instead of Bacula's documented TCP ports: Director `9101`, File Daemon `9102`, and Storage Daemon `9103`.
- Because the article contains unresolved placeholders throughout the core installation, configuration, service management, firewall, verification, and troubleshooting steps, fixing it would require rewriting the guide rather than correcting a small number of technical errors. No changes were made to `README.md`.

## Review Notes
The post should be replaced with a Bacula-specific RHEL 9 guide before publication. A valid replacement should cover the correct Bacula packages, catalog database setup, component configuration files, matching passwords between Director/Storage/File daemon resources, systemd units, firewall ports, and a concrete verification workflow with `bconsole`.
