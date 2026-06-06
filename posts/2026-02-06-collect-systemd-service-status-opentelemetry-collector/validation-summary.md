# Validation Summary: How to Collect SystemD Service Status with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Prometheus receiver
- OpenTelemetry Collector host metrics receiver
- OpenTelemetry Collector resource detection and resource processors
- OpenTelemetry Collector journald receiver
- systemd and systemctl
- Prometheus exposition format
- Linux shell scripting
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Prometheus receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/prometheusreceiver/README.md
- OpenTelemetry Collector host metrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector journald receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/journaldreceiver/README.md
- OpenTelemetry Collector resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- systemctl local help output for command and option validation
- OneUptime host OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post described the approach as a "script receiver" setup, but the provided configuration uses the Prometheus receiver to scrape an HTTP endpoint. Updated the heading and description to say the setup uses a script plus the Prometheus receiver.
- The failed-unit metric was named `systemd_failed_units_total`, but it represents the current number of failed units, not a monotonically increasing counter. Renamed it to `systemd_failed_units` in the script output, example output, and alerting guidance.
- The failed-unit command used an implicit `systemctl` listing. Changed it to `systemctl list-units --state=failed --no-legend --plain` to make the intended command explicit.
- The boot timestamp command parsed `systemctl show` output manually. Changed it to `systemctl show --property=UserspaceTimestamp --value`, which is the documented `systemctl` option for printing only the property value.
- The Collector configuration used the attributes processor to add `deployment.environment` and `service.namespace`, but those are resource attributes. Replaced it with the resource processor and corrected the processor configuration shape to use `attributes`.

## Review Notes
- The Prometheus receiver, host metrics receiver, resource processor, resource detection processor, and OTLP HTTP exporter configuration patterns are consistent with official OpenTelemetry Collector documentation.
- The journald receiver is valid for systemd journal logs, but it is documented as alpha stability for logs and requires `journalctl` plus sufficient journal permissions.
- The shell script is syntactically valid under `bash -n`; runtime behavior still depends on running on a Linux host with systemd and GNU `date`.
