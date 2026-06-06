# Validation Summary: How to Use Ansible to Deploy and Configure OpenTelemetry Collectors Across a

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector OTLP receiver and exporter
- OpenTelemetry Collector hostmetrics receiver
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector resource and resourcedetection processors
- OpenTelemetry Collector health_check extension
- Ansible roles, playbooks, and built-in modules
- systemd services on Linux

## Sources Consulted
- OpenTelemetry Collector Linux installation documentation: https://opentelemetry.io/docs/collector/install/binary/linux/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Releases v0.96.0 release page: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.96.0
- OpenTelemetry Collector Releases GitHub API output for v0.96.0 assets: https://api.github.com/repos/open-telemetry/opentelemetry-collector-releases/releases/tags/v0.96.0
- OpenTelemetry Collector Contrib v0.96.0 filelog receiver documentation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.96.0/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib v0.96.0 hostmetrics receiver documentation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.96.0/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Contrib v0.96.0 resourcedetection processor documentation: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/v0.96.0/processor/resourcedetectionprocessor/README.md
- Ansible systemd_service module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/systemd_service_module.html

## Issues Found
- The service task and handler used the older `systemd` module alias. Updated both examples to `ansible.builtin.systemd_service`, which is the current documented module name and keeps the same `enabled`, `state`, and `daemon_reload` behavior.

## Review Notes
- Rendered the Collector configuration with representative Ansible values and validated it successfully with the pinned `otelcol-contrib` v0.96.0 binary using `otelcol-contrib validate --config=collector-config.yaml`.
- The referenced `otelcol-contrib_0.96.0_linux_amd64.tar.gz` asset exists in the official OpenTelemetry Collector Releases v0.96.0 artifacts.
- The filelog receiver configuration is valid for the contrib distribution, but real deployments must ensure the `otel` service user can read the chosen log files. Permissions for `/var/log/syslog` and `/var/log/auth.log` vary by Linux distribution.
- The pinned Collector version `0.96.0` is older than current OpenTelemetry Collector releases as of June 6, 2026. The versioned example remains technically valid, but production roles should periodically test and update the pinned version.
