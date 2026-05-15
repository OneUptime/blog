# Validation Summary: How to Install Zitadel Identity Platform on RHEL

## Status
not-technically-relevant

## Post Type
Placeholder tutorial

## Technologies Covered
- RHEL 9
- CentOS Stream 9
- DNF
- systemd
- PostgreSQL
- ZITADEL

## Sources Consulted
- ZITADEL Linux deployment guide: https://zitadel.com/docs/self-hosting/deploy/linux
- ZITADEL deployment overview: https://zitadel.com/docs/self-hosting/deploy/overview
- ZITADEL requirements: https://zitadel.com/docs/self-hosting/manage/requirements
- ZITADEL configuration reference: https://zitadel.com/docs/self-hosting/manage/configure/configure
- Red Hat Enterprise Linux 9 PostgreSQL documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index

## Issues Found
- The post is a generic placeholder and does not contain ZITADEL-specific installation, configuration, service, verification, or troubleshooting instructions.
- The commands use unresolved placeholders such as `<package-name>`, `/etc/<service>/config.conf`, and `<service-name>`, so readers cannot use them to install or operate ZITADEL.
- The prerequisite and package installation steps omit ZITADEL's documented PostgreSQL requirement and do not show the RHEL 9 PostgreSQL installation and initialization flow.
- The service configuration section references a generic `/etc/<service>/config.conf` path that is not a documented ZITADEL configuration file.
- The official ZITADEL Linux deployment guide currently warns that the Linux binary guide does not work for ZITADEL 4 and recommends Docker for ZITADEL 4. The post does not mention this version-specific limitation.

## Review Notes
The README was not edited because correcting it would require replacing the placeholder with a new, source-backed ZITADEL installation guide rather than making targeted technical corrections.
