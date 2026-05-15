# Validation Summary: How to Set Up OpenTelemetry Collector on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- CentOS Stream 9
- OpenTelemetry Collector
- RPM packages
- systemd
- journald
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector Linux installation documentation: https://opentelemetry.io/docs/collector/install/binary/linux/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- Red Hat Enterprise Linux 9 software management documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_software_with_the_dnf_tool/
- Local `systemctl --help` output for service management commands.
- Local `journalctl --help` output for log query flags.

## Issues Found
- The post skipped the installation step despite saying it covered setup from initial installation to verification. Added the official RPM installation commands for the OpenTelemetry Collector.
- The configuration path used `/etc/<service>/config.conf`, which is a placeholder and not the default Collector RPM path. Changed it to `/etc/otelcol/config.yaml`.
- The service commands used `<service-name>`, which would not run as written. Changed the commands to use the installed `otelcol` systemd unit.
- The configuration guidance mentioned generic service settings rather than Collector configuration concepts. Updated it to refer to receivers, processors, exporters, service pipelines, authentication extensions, and logging options.
- Added a minimal valid Collector YAML configuration that receives OTLP data and exports it through the `debug` exporter.
- Updated troubleshooting commands to use the real `otelcol` unit, the Collector `validate` command, and the installed package name.

## Review Notes
- The RPM download URL is version-specific and was current in the official OpenTelemetry documentation at review time. Future updates should check the latest Collector release before republishing.
