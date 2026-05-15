# Validation Summary: How to Install and Configure Vector for High-Performance Log Collection on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Vector
- Red Hat Enterprise Linux 9
- DNF/YUM package management
- systemd
- journald
- YAML configuration

## Sources Consulted
- Vector documentation: Install Vector using YUM, https://vector.dev/docs/setup/installation/package-managers/yum/
- Vector documentation: Install Vector using RPM, https://vector.dev/docs/setup/installation/package-managers/rpm/
- Vector documentation: Configuring Vector, https://vector.dev/docs/reference/configuration/
- Vector documentation: JournalD source, https://vector.dev/docs/reference/configuration/sources/journald/
- Vector documentation: Console sink, https://vector.dev/docs/reference/configuration/sinks/console/
- Vector documentation: Management, https://vector.dev/docs/administration/management/
- Vector documentation: Validating, https://vector.dev/docs/administration/validating/
- Red Hat Enterprise Linux 9 documentation: Configuring basic system settings, https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/htmlsingle/configuring_basic_system_settings/index

## Issues Found
- The installation command used `<package-name>` as a placeholder instead of the official Vector package setup. Replaced it with the official Vector repository setup command and `sudo dnf install -y vector`.
- The configuration path used `/etc/<service>/config.conf`, which is not Vector's default Linux configuration path. Replaced it with `/etc/vector/vector.yaml`.
- The service commands used `<service-name>` placeholders. Replaced them with the Vector systemd service name, `vector`.
- The post did not include a valid Vector configuration. Added a minimal YAML configuration using the stable `journald` source and `console` sink with JSON encoding.
- The verification and troubleshooting commands used placeholders. Replaced them with `systemctl`, `journalctl`, and `rpm` commands that target Vector directly.
- Added `vector validate /etc/vector/vector.yaml` so readers can verify the configuration before restarting the service.

## Review Notes
The example sends journald events to the console for basic verification. Production deployments should replace or extend the sink with the destination required by the environment, such as a Vector, HTTP, Kafka, Loki, Datadog, or other supported sink.
