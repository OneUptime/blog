# Validation Summary: How to Parse Syslog RFC 5424 and RFC 3164 Messages with the Syslog Receiver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib syslog receiver
- OpenTelemetry Collector filelog receiver
- Stanza `syslog_parser` operator
- OpenTelemetry transform processor
- OpenTelemetry filter processor
- Syslog RFC 5424
- Syslog RFC 3164
- Syslog over UDP, TCP, and TLS

## Sources Consulted
- OpenTelemetry Collector Contrib syslog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/syslogreceiver/README.md
- OpenTelemetry Collector Contrib `syslog_parser` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/syslog_parser.md
- OpenTelemetry Collector Contrib syslog parser source: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/pkg/stanza/v0.148.0/pkg/stanza/operator/parser/syslog/parser.go
- OpenTelemetry Collector Contrib filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- RFC 5424: The Syslog Protocol: https://datatracker.ietf.org/doc/html/rfc5424
- RFC 3164: The BSD Syslog Protocol: https://datatracker.ietf.org/doc/html/rfc3164

## Issues Found

1. **RFC 5424 timestamp precision was described too narrowly**: Changed "millisecond timestamps" to "subsecond timestamps" because RFC 5424 supports fractional seconds, and the example uses six fractional digits.

2. **RFC 3164 timezone guidance was too absolute**: Changed the wording to say users should set `location` to the timezone used by senders when it is not UTC. The receiver default is UTC, but RFC 3164 messages do not include timezone information.

3. **The mixed-format example referenced undefined pipeline components**: Added `processors.batch` and an `otlp` exporter configuration so the referenced `batch` processor and `otlp` exporter are defined.

4. **Facility mapping duplicated receiver output and overstated semantic convention support**: The syslog parser now emits `facility_text`. Replaced the manual numeric facility mapping with a transform that copies `facility_text` to a custom attribute.

5. **Parsed attributes list was incomplete**: Added `facility_text`, `message`, `version`, and optional RFC 3164 `proc_id`/`msg_id` details to match the syslog parser output.

6. **Severity mapping table was incorrect**: Updated the table to match the Collector syslog parser mapping: emergency maps to `Fatal`, alert and critical map into the `Error` range, notice maps to `Info2`, and the receiver sets lowercase syslog severity text values such as `emerg`, `alert`, and `notice`.

7. **Filter processor example used outdated configuration and the wrong attribute scope**: Replaced the old `logs.include.resource_attributes` example with the current OTTL-based `log_conditions` form. The corrected condition drops logs whose log attribute `facility` is neither 4 nor 10, which keeps auth and authpriv messages.

## Review Notes
- The syslog receiver is part of the OpenTelemetry Collector Contrib distribution and is currently documented as beta for logs.
- The `syslog_parser` operator used by the filelog receiver supports the same `rfc3164` and `rfc5424` protocol values.
- The filter processor's current documented behavior is drop-on-match, so allow-list behavior must be written as a negative condition.
