# Validation Summary: How to Switch an Existing RHEL System to FIPS Mode Post-Installation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- FIPS mode and FIPS 140
- RHEL system-wide crypto policies
- fips-mode-setup
- OpenSSH host keys
- OpenSSL certificates
- Apache HTTP Server TLS configuration
- PostgreSQL TLS verification
- MariaDB TLS verification
- Java and Python cryptography behavior
- Podman containers

## Sources Consulted
- Red Hat Enterprise Linux 9 Security hardening, "Switching RHEL to FIPS mode": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/switching-rhel-to-fips-mode_security-hardening
- Red Hat Enterprise Linux 9 Security hardening, "Using system-wide cryptographic policies": https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/security_hardening/using-the-system-wide-cryptographic-policies_security-hardening
- Red Hat Enterprise Linux 9.5 Release Notes, deprecated functionality for `fips-mode-setup`: https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/pdf/9.5_release_notes/Red_Hat_Enterprise_Linux-9-9.5_Release_Notes-en-US.pdf
- Red Hat Enterprise Linux 9 Configuring and using database servers, PostgreSQL TLS verification examples: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/configuring_and_using_database_servers/index
- PostgreSQL documentation, `pg_stat_ssl` view: https://www.postgresql.org/docs/current/static/monitoring-stats.html
- MariaDB documentation, `SHOW STATUS` syntax and session/global scope: https://mariadb.com/docs/server/reference/sql-statements/administrative-sql-statements/show/show-status
- MariaDB documentation, TLS status check using `SHOW SESSION STATUS LIKE 'Ssl_cipher'`: https://mariadb.com/docs/server/security/encryption/data-in-transit-encryption/zero-configuration-ssl

## Issues Found
- The introduction said RHEL makes post-install FIPS switching straightforward without noting Red Hat's compliance guidance. Updated it to state that RHEL provides a post-install switch path, but Red Hat recommends installing with FIPS enabled when FIPS compliance is required.
- The `fips-mode-setup --enable` explanation said the command installs `crypto-policies-scripts` if needed. Red Hat documents that `fips-mode-setup` uses `fips-finish-install` to ensure the FIPS dracut module is installed, adds `fips=1`, and regenerates initramfs. Updated the bullet accordingly.
- The post did not mention that Red Hat documents `fips-mode-setup` as deprecated in RHEL 9.5 for switching systems to FIPS mode. Added a version-specific caveat while preserving the post-install procedure that current RHEL 9 security hardening docs still describe.
- The PostgreSQL verification command used `SHOW ssl_cipher;`, which is not a standard PostgreSQL configuration parameter. Replaced it with a query against `pg_stat_ssl` for the current backend PID.
- The MariaDB check used `SHOW GLOBAL STATUS LIKE 'Ssl_cipher';`, which does not verify the current client connection's TLS cipher. Changed it to `SHOW SESSION STATUS LIKE 'Ssl_cipher';`.
- The reverting section presented disabling FIPS as a normal testing option. Red Hat warns that switching off FIPS after setup puts the system into an inconsistent state and recommends reinstalling if non-FIPS is required. Updated the section to include that warning and limit the command to disposable test systems.

## Review Notes
- The core `fips-mode-setup --enable`, reboot, `fips-mode-setup --check`, `/proc/sys/crypto/fips_enabled`, crypto policy, key regeneration, and Podman FIPS inheritance guidance matches Red Hat's RHEL 9 documentation.
- The `/boot` guidance is directionally consistent with Red Hat's security partitioning guidance and known FIPS boot behavior, but current RHEL 9 FIPS switching documentation does not present it as a universal prerequisite in the main procedure.
