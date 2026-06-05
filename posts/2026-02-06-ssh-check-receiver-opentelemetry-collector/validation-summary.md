# Validation Summary: How to Configure the SSH Check Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- SSH Check receiver
- SSH and SFTP connectivity checks
- OTLP HTTP exporter
- Collector processors: memory_limiter, resource, batch
- SSH key and known_hosts management

## Sources Consulted
- OpenTelemetry Collector Contrib sshcheckreceiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/sshcheckreceiver/README.md
- OpenTelemetry Collector Contrib sshcheckreceiver metadata.yaml: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/sshcheckreceiver/metadata.yaml
- OpenTelemetry Collector Contrib sshcheckreceiver config.go: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/sshcheckreceiver/config.go
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenSSH ssh-keygen manual page: https://man.openbsd.org/ssh-keygen
- OpenSSH ssh-keyscan manual page: https://man.openbsd.org/ssh-keyscan.1
- OpenSSH ssh manual page: https://man.openbsd.org/ssh
- OpenSSH sftp manual page: https://man.openbsd.org/sftp.1

## Issues Found
- The post used `sshcheck` as the receiver component type throughout. The official receiver metadata now lists `ssh_check` as the current component type and `sshcheck` as a deprecated alias. Updated receiver IDs and pipeline references to `ssh_check`, while leaving metric names as `sshcheck.*` because those are still the documented metric names.
- The post used old Collector environment variable expansion such as `${ONEUPTIME_TOKEN}` and `${SSH_PASSWORD}` in Collector YAML. Updated examples to the current documented `${env:VAR}` form.
- The production example configured `service.telemetry.metrics.address`, which the official internal telemetry docs state is ignored as of Collector v0.123.0. Replaced it with `service.telemetry.metrics.level: basic`.
- The introduction suggested using OpenTelemetry Collector "script-based processors" for remote command execution. The Collector does not provide a general remote command execution processor. Reworded this to recommend purpose-built automation tools or deploying OpenTelemetry agents.
- The OneUptime integration snippet referenced receiver and processor IDs that were not defined in the snippet. Added minimal `ssh_check` receivers and `resource`/`batch` processors so the example is internally consistent.
- The memory limit example referenced `otlphttp` without defining it. Added the exporter definition used by the service pipeline.

## Review Notes
The receiver's metric names intentionally retain the `sshcheck.*` prefix even though the component type is now `ssh_check`. The SSH Check receiver is currently listed as beta for metrics in the OpenTelemetry Collector Contrib distribution, and its individual metrics are marked development stability in metadata.
