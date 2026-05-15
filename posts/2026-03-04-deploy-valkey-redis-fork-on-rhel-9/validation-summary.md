# Validation Summary: How to Deploy Valkey (Redis Fork) on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Valkey
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- DNF
- systemd
- journalctl

## Sources Consulted
- Red Hat Enterprise Linux 9.7 Release Notes: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/9.7_release_notes/
- Red Hat Enterprise Linux 10 Monitoring and managing system status and performance, Configuring valkey: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/10/html-single/monitoring_and_managing_system_status_and_performance/monitoring_and_managing_system_status_and_performance
- Valkey installation documentation: https://valkey.io/topics/installation/
- Valkey configuration documentation: https://valkey.io/topics/valkey.conf/
- Valkey CLI documentation: https://valkey.io/topics/cli/
- Valkey PING command documentation: https://valkey.io/commands/ping/
- Red Hat Enterprise Linux 9 systemd documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/configuring_basic_system_settings/managing-systemd_configuring-basic-system-settings

## Issues Found
- The prerequisites said RHEL or CentOS Stream 9 generally, but Valkey is available in RHEL 9.7 and later. Updated the prerequisite to specify RHEL 9.7 or later and the AppStream repository.
- The guide started at Step 2 and did not install Valkey. Added a Step 1 installation command using `sudo dnf install valkey`.
- The configuration path used `/etc/<service>/config.conf`, which is a placeholder and not a Valkey configuration file. Replaced it with `/etc/valkey/valkey.conf`.
- The systemd commands used `<service-name>` placeholders that would not run. Replaced them with the `valkey` service.
- The verification section only checked generic service status and logs. Added `valkey-cli PING`, which is the standard Valkey connectivity check and should return `PONG`.
- The troubleshooting package check used a placeholder grep command. Replaced it with `rpm -q valkey`.

## Review Notes
The guide is now technically valid for the packaged Valkey service on RHEL 9.7 or later. For production use, it could later be expanded with firewall, SELinux, TLS, persistence, memory, and authentication hardening guidance, but those additions were outside the requested correction scope.
