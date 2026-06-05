# Validation Summary: How to Parse Kubernetes Audit Logs with the Filelog Receiver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes audit logging and audit policies
- OpenTelemetry Collector Contrib
- Filelog receiver
- Stanza `json_parser`, `move`, `remove`, and `severity_parser` operators
- OpenTelemetry filter, transform, resource, and batch processors
- OTLP exporter

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Stanza `json_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Stanza field syntax documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/field.md
- OpenTelemetry Stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Stanza severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry Collector Contrib filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- OpenTelemetry Collector Contrib v0.153.0 binary validation command: `otelcol-contrib validate`

## Issues Found
- The post stated that Kubernetes audit logs record every API server request. Kubernetes audit logging is controlled by the configured audit policy, so the wording was changed to say audit logs can record requests based on that policy.
- The `json_parser` timestamp layout used `%L`, which parses milliseconds, while the sample audit timestamp has microseconds. Updated the layout to `%f`.
- Nested JSON fields such as `user.username`, `objectRef.resource`, and `responseStatus.code` were referenced as literal dotted attribute keys. Updated them to nested Stanza field paths such as `attributes.user.username`.
- Added `parse_ints: true` so numeric response codes remain integer-like values suitable for severity mappings and downstream comparisons.
- The severity mapping used quoted status code strings. Updated it to numeric mappings and documented range aliases such as `2xx` and `5xx`.
- The filter processor examples used the older `logs.include/exclude.record_attributes` configuration. Updated them to current OTTL `log_conditions`.
- The transform processor example used unqualified `attributes[...]` paths. Updated it to current `log.attributes[...]` paths.
- The audit policy comments implied the anonymous-user rule only logs authentication failures and that `group: ""` logs everything else. Updated the comments to accurately describe anonymous requests and core API resources.

## Review Notes
The corrected Collector examples were validated with `otelcol-contrib` v0.153.0. The filter processor documentation notes that pre-v0.146 configuration remains supported but is no longer the documented current form.
