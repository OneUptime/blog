# Validation Summary: How to Collect Syslog Messages from Network Devices with the Collector

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib syslog receiver
- OpenTelemetry transform and filter processors
- Syslog RFC 3164, RFC 5424, and RFC 6587 framing
- OTLP exporter
- Network device syslog configuration for Cisco IOS/IOS-XE, Juniper Junos, Palo Alto PAN-OS, and Fortinet FortiOS

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib syslog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/syslogreceiver/README.md
- OpenTelemetry Collector Contrib syslog parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/syslog_parser.md
- OpenTelemetry Collector Contrib syslog parser source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/operator/parser/syslog/parser.go
- OpenTelemetry transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry OTTL log context documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- RFC 3164, The BSD Syslog Protocol: https://www.rfc-editor.org/rfc/rfc3164
- RFC 5424, The Syslog Protocol: https://www.rfc-editor.org/rfc/rfc5424
- RFC 6587, Transmission of Syslog Messages over TCP: https://www.rfc-editor.org/rfc/rfc6587

## Issues Found
- The Collector examples moved `attributes["net.host.name"]` into `resource["host.name"]`, but the syslog parser emits the parsed syslog hostname as `attributes["hostname"]` by default. Updated both receiver examples to move `attributes["hostname"]`.
- The transform example treated OpenTelemetry `severity_number` as raw syslog severity values 0-7. The syslog parser maps syslog severity to OpenTelemetry severity fields and removes the raw `severity` attribute during post-processing. Updated the example to copy `log.severity_text` into `log.attributes["syslog.severity.text"]`.
- The device-specific parsing examples matched and extracted from `body`, but the syslog parser stores the parsed syslog message text in `log.attributes["message"]`. Updated the Cisco and Palo Alto transform examples to use `log.attributes["message"]`.
- The filter example used the legacy `logs.log_record` shape and compared `severity_number > 6`, which would not correctly drop debug logs in the OpenTelemetry severity scale. Updated it to current `log_conditions` syntax and to filter on `log.severity_text == "debug"`.
- The alert examples compared severity as if lower numbers were more severe. Updated the examples to use OpenTelemetry severity enum thresholds such as `SEVERITY_NUMBER_WARN` and `SEVERITY_NUMBER_ERROR`.

## Review Notes
The alert rule block is illustrative logic rather than a complete Collector or vendor-specific alert configuration. The network-device command snippets are plausible for the named platforms, but exact command availability can vary by OS release, feature set, and device model.
