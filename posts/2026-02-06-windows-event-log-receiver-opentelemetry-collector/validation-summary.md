# Validation Summary: How to Configure the Windows Event Log Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector contrib Windows Event Log receiver
- OpenTelemetry Collector transform processor and OTTL
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector resource and resource detection processors
- Windows Event Log and PowerShell `Get-WinEvent`

## Sources Consulted
- Windows Event Log receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/windowseventlogreceiver/README.md
- Transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- Filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- Resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Microsoft Windows Event Log query schema: https://learn.microsoft.com/en-us/windows/win32/wes/queryschema-schema

## Issues Found
- The receiver examples used the deprecated `windowseventlog` component type. Updated them to the current documented `windows_event_log` type.
- The post described parsed Windows event fields as automatic log attributes such as `event.id`, `event.level`, and `event.provider`. Updated the explanation and transform examples to use the receiver's structured `log.body` fields, including `log.body["event_id"]["id"]`, `log.body["level"]`, `log.body["provider"]["name"]`, and `log.body["event_data"]`.
- Event data examples used `body["EventData"]`, which does not match the current receiver output. Updated them to `log.body["event_data"]`.
- Transform processor examples used older/unqualified OTTL paths. Updated them to current documented `log.*` paths.
- The failed-login filter used deprecated `logs.log_record` syntax and dropped records with source IPs instead of keeping them. Updated it to `log_conditions` and inverted the condition so non-remote records are dropped.
- The resource detection examples used deprecated `resourcedetection`. Updated them to `resource_detection`.
- The start-position section implied bookmarks survive restarts automatically. Clarified that bookmarks are in memory unless the receiver `storage` option is configured with a storage extension.
- The production example used the ignored `service.telemetry.metrics.address` field. Updated it to the current `service.telemetry.metrics.readers` Prometheus pull configuration.
- The start-position YAML showed two active `start_at` keys in the same receiver. Commented the alternative value so the snippet is unambiguous.

## Review Notes
The Windows Event Log receiver remains alpha for logs in the contrib distribution. Some event data field names vary by Windows event provider and event ID, so production transforms should be tested against sample events from the target Windows hosts.
