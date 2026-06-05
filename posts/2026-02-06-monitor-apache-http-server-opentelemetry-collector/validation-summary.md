# Validation Summary: How to Monitor Apache HTTP Server with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache HTTP Server
- Apache mod_status
- OpenTelemetry Collector Contrib
- OpenTelemetry Apache Web Server receiver
- OpenTelemetry filelog receiver
- OpenTelemetry resource, resource detection, batch processors
- OpenTelemetry OTLP/HTTP exporter
- OneUptime OpenTelemetry ingestion

## Sources Consulted
- Apache HTTP Server mod_status documentation: https://httpd.apache.org/docs/current/mod/mod_status.html
- OpenTelemetry Collector Apache Web Server receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/apachereceiver
- OpenTelemetry Collector Apache receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/apachereceiver/metadata.yaml
- OpenTelemetry Collector filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver
- OpenTelemetry Collector stanza regex_parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector stanza severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry Collector stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector resource processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourceprocessor
- OpenTelemetry Collector resource detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/resourcedetectionprocessor
- OpenTelemetry Collector file storage extension README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/extension/storage/filestorage
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- OneUptime OTLP/HTTP exporter examples were missing `encoding: json` and the `Content-Type: application/json` header required by OneUptime's Collector example. Added those settings to each `otlphttp` exporter snippet.
- The post described `apache.uptime` and busy worker values as gauges. Current Apache receiver metadata defines `apache.uptime` as a cumulative monotonic sum and worker/state counts as non-monotonic cumulative sums. Updated the descriptions.
- The metric list omitted current Apache receiver metrics such as `apache.connections.async`, CPU/load metrics, and `apache.request.time`. Added them to the metric discussion and production metrics configuration.
- The production configuration used the deprecated `resourcedetection` component name and used the attributes processor for resource attributes. Updated it to `resource_detection` and `resource/apache`.
- The custom attribute `apache.server_name` did not match the receiver's resource attribute naming. Changed it to `apache.server.name`.
- The access log regex only accepted numeric byte counts, but Apache combined logs using `%b` can emit `-` when no bytes are sent. Updated the regex to accept either digits or `-`.
- The access log severity mapping used regex-like strings such as `2\\d{2}`, but the stanza severity parser expects explicit values, ranges, or special HTTP status groups such as `2xx`. Replaced the mapping with `2xx`, `3xx`, `4xx`, and `5xx`.
- The Apache error log timestamp layout used `%d`, which can fail for space-padded single-digit days. Updated it to `%e`.
- Apache's `notice` error level was not mapped. Added a severity mapping for `notice`.
- The retry and sending queue text overstated reliability by saying it prevents data loss. Clarified that it reduces data loss while the in-memory queue has capacity and the Collector process keeps running.

## Review Notes
- The YAML code fences were parsed successfully after the edits.
- The Apache receiver is available in the OpenTelemetry Collector Contrib distribution and supports Apache HTTP Server 2.4.13+.
- The filelog receiver's `storage` setting requires a configured storage extension and persistent directory access, which the examples include.
