# Validation Summary: How to Deploy Sonatype Nexus Repository Manager on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Sonatype Nexus Repository
- systemd
- journalctl

## Sources Consulted
- Sonatype Nexus Repository documentation: Install Self-Hosted Nexus Repository: https://help.sonatype.com/en/install-nexus-repository.html
- Sonatype Nexus Repository documentation: Run as a Service: https://help.sonatype.com/en/run-as-a-service.html
- Sonatype Nexus Repository documentation: Configuring the Runtime Environment: https://help.sonatype.com/en/configuring-the-runtime-environment.html
- Sonatype Nexus Repository downloads: https://help.sonatype.com/en/download.html
- Red Hat Enterprise Linux 9 documentation: Managing system services with systemctl: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/epub/configuring_basic_system_settings/managing-system-services-with-systemctl_configuring-basic-system-settings
- Local command help output for `systemctl --help` and `journalctl --help`

## Issues Found
- The original guide used placeholder paths and service names such as `/etc/<service>/config.conf` and `<service-name>`, which are not valid Nexus Repository deployment instructions. I replaced them with the Nexus-specific `nexus.rc`, `nexus.service`, and `nexus.service` systemctl commands from Sonatype's service documentation.
- The original guide described generic listening address, authentication, and logging settings without identifying the Nexus configuration file. I changed this to the supported `$data-dir/etc/nexus.properties` path and included current `application-port` and `nexus-context-path` examples from Sonatype documentation.
- The original service enable/start section omitted `systemctl daemon-reload`, which is required after creating a new unit file before systemd reliably sees it. I added that command before enabling and starting `nexus.service`.
- The original verification and troubleshooting examples used generic placeholders and RPM package checks that do not verify an archive-based Nexus installation. I updated them to use `nexus.service`, the Nexus application log at `/opt/sonatype-work/nexus3/log/nexus.log`, permission checks for the Nexus user, and the documented initial admin password file.

## Review Notes
The post now contains technically correct service configuration and runtime configuration guidance for a Nexus Repository archive installation on RHEL-compatible systems. It still assumes Nexus Repository has already been downloaded and extracted under `/opt/sonatype/nexus`; a future content update could add a dedicated installation step with the current download URL and checksum verification.
