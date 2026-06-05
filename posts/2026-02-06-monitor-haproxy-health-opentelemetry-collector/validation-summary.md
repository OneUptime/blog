# Validation Summary: How to Monitor HAProxy Load Balancer Health with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- HAProxy
- OpenTelemetry Collector
- OpenTelemetry Collector contrib HAProxy receiver
- OpenTelemetry Collector filelog receiver
- OpenTelemetry Collector resource, resource detection, attributes, and batch processors
- OTLP HTTP export to OneUptime

## Sources Consulted
- OpenTelemetry Collector contrib HAProxy receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/haproxyreceiver/README.md
- OpenTelemetry Collector contrib HAProxy receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/haproxyreceiver/documentation.md
- OpenTelemetry Collector contrib HAProxy receiver implementation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/haproxyreceiver/scraper.go
- OpenTelemetry Collector contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector stanza regex parser documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector attributes processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- HAProxy configuration manual, statistics directives: https://docs.haproxy.org/3.2/configuration.html
- HAProxy logging documentation: https://www.haproxy.com/documentation/haproxy-enterprise/administration/logs/
- OneUptime host OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The Collector HAProxy receiver endpoint examples incorrectly included `?stats;csv`. The receiver appends `;csv` to HTTP endpoints internally, so the configured endpoint should point at the stats URI, such as `http://localhost:8404/stats`.
- The post used invalid HAProxy receiver metric names: `haproxy.server.check.status`, `haproxy.sessions.current`, and `haproxy.requests.queued.current`. These were corrected to documented metrics and attributes: `haproxy.failed_checks`, `haproxy.server.state`, `haproxy.sessions.count`, and `haproxy.requests.queued`.
- The post said the receiver automatically collects all available metrics. This was narrowed to enabled metrics because the HAProxy receiver has default and optional metrics.
- The production examples used the attributes processor for resource-level labels such as `service.name` and `deployment.environment`. These were changed to the resource processor.
- The examples used the deprecated `resourcedetection` processor type. This was changed to `resource_detection`.
- The HAProxy log parser only allowed positive timing values. HAProxy timing fields can be negative in some cases, so the regex now accepts optional minus signs.
- Troubleshooting commands used a URL shape inconsistent with `stats uri /stats`. They now use `/stats;csv`.

## Review Notes
- The HAProxy receiver is in the OpenTelemetry Collector contrib distribution and is currently documented as beta for metrics.
- Several HAProxy receiver metrics and resource attributes are marked development stability in the generated receiver documentation, so dashboards and alerts should be reviewed when upgrading Collector versions.
