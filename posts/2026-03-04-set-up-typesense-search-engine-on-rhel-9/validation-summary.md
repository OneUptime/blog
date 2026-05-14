# Validation Summary: How to Set Up Typesense Search Engine on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- Typesense Server
- RPM packages
- systemd
- journalctl

## Sources Consulted
- Typesense official install guide: https://typesense.org/docs/guide/install-typesense.html
- Typesense official server configuration reference: https://typesense.org/docs/30.2/api/server-configuration.html
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings

## Issues Found
- The guide referenced placeholder paths and service names such as `/etc/<service>/config.conf`, `<service-name>`, and `<package-name>`. These were replaced with the official Typesense RPM configuration path `/etc/typesense/typesense-server.ini`, the `typesense-server.service` systemd unit, and the `typesense-server` RPM package name.
- The guide did not include an installation command even though it described setup from installation to verification. Added the official RPM download and install commands for the x86_64 CentOS/RHEL package.
- The configuration guidance used generic terms. Updated it to list current Typesense server configuration parameters such as `api-address`, `api-port`, `api-key`, `data-dir`, and `log-dir`.
- The verification section only checked systemd status and logs. Added a check for the official Typesense `/health` endpoint on the default port `8108`.

## Review Notes
The RPM command now pins Typesense Server v30.2, which is the current version shown in the official documentation during validation. Future reviews should update this version if the Typesense latest release changes.
