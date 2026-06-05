# Validation Summary: How to Monitor IIS Web Server Performance with the Collector

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Microsoft IIS
- Windows Performance Counters
- OpenTelemetry Collector Contrib
- `windowsperfcounters` receiver
- `filelog` receiver
- Collector `batch`, `resource`, `resourcedetection`, and `otlp` components
- PowerShell / Windows service installation

## Sources Consulted
- OpenTelemetry Collector Windows installation documentation: https://opentelemetry.io/docs/collector/install/binary/windows/
- OpenTelemetry Collector releases page: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.153.0
- OpenTelemetry Collector Contrib distribution manifest: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-releases/main/distributions/otelcol-contrib/manifest.yaml
- OpenTelemetry Collector Contrib `windowsperfcounters` receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/windowsperfcountersreceiver/README.md
- OpenTelemetry Collector Contrib `filelog` receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector stanza `filter` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/filter.md
- OpenTelemetry Collector stanza `regex_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib `resourcedetection` processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourcedetectionprocessor
- OpenTelemetry Collector `resource` processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/resourceprocessor
- Microsoft ASP.NET performance counter documentation: https://learn.microsoft.com/en-us/previous-versions/aspnet/fxk122b4%28v%3Dvs.100%29
- Microsoft IIS Web Service performance counter documentation: https://learn.microsoft.com/en-us/previous-versions/aa394345%28v%3Dvs.85%29
- Microsoft HTTP.sys performance counter documentation: https://learn.microsoft.com/en-us/windows/win32/http/scenario-3--performance-counters
- Microsoft IIS logging configuration documentation: https://learn.microsoft.com/en-us/iis/manage/provisioning-and-managing-iis/configure-logging-in-iis

## Issues Found
- The Collector metrics configuration used `from_attribute: ""` for `host.name` in the `resource` processor. Current Collector validation rejects this because a resource action must specify a real `value`, `from_attribute`, `from_context`, or `default_value`. I replaced it with the supported `resourcedetection/system` processor, which detects `host.name` from the Windows host, and left the `resource` processor to set `service.name`.
- The IIS log parser captured `date` and `time` separately but parsed only `attributes.date` as the log timestamp, which discarded the time of day. I changed the regex to capture a combined timestamp, parse it with `%Y-%m-%d %H:%M:%S`, and set `location: UTC` because IIS W3C logging records the `time` field in UTC.
- The installation example pinned an old Collector Contrib version and extracted the archive without ensuring the target service path existed. I updated the example to v0.153.0, extract into `C:\otelcol`, and register the service with PowerShell `New-Service`.
- The post described `ASP.NET Applications / Errors Total/Sec` as catching 500-level errors. Microsoft documents this counter as parser, compilation, and runtime errors per second, not only HTTP 500 responses. I corrected the wording.

## Review Notes
The YAML snippets parse successfully. The log pipeline snippet validates with `otel/opentelemetry-collector-contrib:0.153.0`. The metrics pipeline was checked with the same Collector image and now gets past the corrected processor schema; full runtime validation must be performed on Windows because the `windowsperfcounters` receiver intentionally refuses to instantiate on Linux.
