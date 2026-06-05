# Validation Summary: How to Configure F5 BIG-IP iRules to Inject W3C traceparent Headers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- W3C Trace Context / `traceparent`
- F5 BIG-IP iRules
- F5 BIG-IP High Speed Logging (HSL)
- F5 `tmsh`
- OpenTelemetry Collector syslog receiver
- OpenTelemetry log trace context parsing

## Sources Consulted
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/
- F5 iRules `HTTP::header` documentation: https://clouddocs.f5.com/api/irules/HTTP__header.html
- F5 iRules High Speed Logging overview: https://clouddocs.f5.com/api/irules/HSL.html
- F5 iRules `HSL::open` documentation: https://clouddocs.f5.com/api/irules/HSL__open.html
- F5 iRules `HSL::send` documentation: https://clouddocs.f5.com/api/irules/HSL__send.html
- F5 iRules `virtual` command documentation: https://clouddocs.f5.com/api/irules/virtual.html
- F5 `ltm virtual` tmsh reference: https://clouddocs.f5.com/cli/tmsh-reference/v14/modules/ltm/ltm_virtual.html
- OpenTelemetry Collector syslog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/syslogreceiver/README.md
- OpenTelemetry Collector stanza `regex_parser` documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector stanza `trace_parser` documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/trace_parser.md
- OpenTelemetry Collector stanza trace parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/trace.md

## Issues Found
- The post treated any existing `traceparent` header as valid. Updated both iRule examples to validate W3C Trace Context field lengths, lowercase hexadecimal format, and non-zero trace/span IDs before propagating.
- The generated ID examples could theoretically emit all-zero trace IDs or span IDs, which W3C Trace Context marks invalid. Updated ID generation loops to retry all-zero values.
- The "span creation" wording implied that changing the outgoing `parent-id` by itself creates an OpenTelemetry span. Clarified that a real BIG-IP span also requires a logged or exported record.
- The HSL sample used an undefined `$hsl_pool` handle. Added `HSL::open` in `CLIENT_ACCEPTED` and used the returned `$hsl` handle with `HSL::send`.
- The Collector syslog receiver configuration used an invalid shape (`protocol: udp` and top-level `listen_address`). Updated it to the current `udp.listen_address` form and `protocol: none` for raw HSL log payloads.
- The Collector example omitted `trace_flags` parsing. Added `trace_flags` to the emitted log data, regex parser, and `trace_parser`.
- The post said BIG-IP could send "trace data" to the Collector via syslog, but the shown pipeline is a logs pipeline with trace context attached. Updated the wording to "correlated log data."

## Review Notes
The iRule examples use Tcl `rand()` for simple illustrative ID generation. For production tracing, prefer a source of randomness appropriate for the BIG-IP version and operational security requirements, and validate behavior in a staging BIG-IP environment before deployment.
