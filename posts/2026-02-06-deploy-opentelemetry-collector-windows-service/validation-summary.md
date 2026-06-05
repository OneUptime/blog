# Validation Summary: How to Deploy the OpenTelemetry Collector on Windows as a Service

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- Windows services
- PowerShell
- Service Control Manager (`sc.exe`)
- NSSM
- Windows Event Log receiver
- Host Metrics receiver
- OTLP receiver and exporter
- Debug exporter

## Sources Consulted
- OpenTelemetry Collector Windows installation documentation: https://opentelemetry.io/docs/collector/install/binary/windows/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporters list: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector receivers list: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector Debug Exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector Contrib Windows Event Log Receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/windowseventlogreceiver/README.md
- OpenTelemetry Collector Releases latest assets: https://github.com/open-telemetry/opentelemetry-collector-releases/releases

## Issues Found
- The post used the core `otelcol` distribution while configuring the Windows Event Log receiver. The Windows Event Log receiver is part of the contrib distribution, so the download URLs, executable name, service command, NSSM command, validation command, and update steps were changed to use `otelcol-contrib`.
- The example pinned old Collector versions (`0.95.0` and `0.96.0`) while describing the download as the latest Collector binary. Updated the examples to `0.153.0`, the latest release checked during validation.
- The configuration used the deprecated/removed `logging` exporter with `loglevel`. Replaced it with the current `debug` exporter and `verbosity: normal`, and updated all pipelines to reference `debug`.
- The configuration used `service.telemetry.metrics.address`, which is ignored in Collector versions `0.123.0` and later. Replaced it with the current `readers` / pull Prometheus exporter configuration.
- The Windows Event Log receiver used the deprecated `windowseventlog` component type. Updated it to the current `windows_event_log` component name.
- The `sc.exe create` `binPath` value did not quote the executable and config paths correctly for paths containing spaces. Updated it to quote both paths.

## Review Notes
- The current official Windows installation docs also document MSI installers that create a Windows service automatically. The manual service setup remains valid for users who need explicit SCM or NSSM control.
- The local validation environment is Linux, so the Windows service startup and Windows-only receiver runtime behavior could not be executed end to end. The cross-platform Collector config elements were checked with `otelcol-contrib` v0.153.0, and the Windows-only receiver fields were checked against the official contrib receiver documentation.
