# Validation Summary: How to Bridge SNMP Network Equipment Metrics into OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib SNMP receiver
- SNMP v2c and v3
- SNMP MIB-II / IF-MIB metrics
- OpenTelemetry Python logging SDK
- PySNMP

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Contrib SNMP receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/snmpreceiver/README.md
- OpenTelemetry Collector Contrib SNMP receiver Go package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/snmpreceiver
- OpenTelemetry Python instrumentation documentation for logs: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python logging instrumentation documentation: https://opentelemetry-python-contrib.readthedocs.io/en/latest/instrumentation/logging/logging.html
- PySNMP 7.1 asyncio documentation: https://docs.lextudio.com/pysnmp/v7.1/examples/hlapi/v1arch/asyncio/
- RFC 3418, Management Information Base for SNMP: https://www.rfc-editor.org/info/rfc3418
- RFC 2863, The Interfaces Group MIB: https://www.rfc-editor.org/info/rfc2863

## Issues Found
- The `resource.name` SNMP resource attribute used `oid` for `sysName.0`. The SNMP receiver reserves `oid` for indexed table OIDs; scalar resource attributes must use `scalar_oid`. Changed it to `scalar_oid: "1.3.6.1.2.1.1.5.0"`.
- The Cisco CPU and memory examples used table-instance OIDs under `scalar_oids`, while the receiver documentation says scalar OIDs must be scalar values ending in `.0`. Replaced those examples with standard scalar MIB-II values: `sysUpTime.0` and `ifNumber.0`.
- The multiple-device section claimed the SNMP receiver has discovery capabilities. The official SNMP receiver configuration documents a single `endpoint` per receiver and does not document built-in SNMP target discovery. Reworded this to recommend multiple receiver instances or generated configuration from inventory.
- The Python trap logging example configured an OpenTelemetry `LoggerProvider` but did not attach an OpenTelemetry logging handler to the Python `logging` logger, so `logging.getLogger(...).warning(...)` would not be exported as OpenTelemetry logs. Added `LoggingHandler` and `logging.basicConfig(...)` using the documented OpenTelemetry Python logging pattern.
- Removed unused/deprecated-looking OpenTelemetry imports from the Python example (`trace` and `LogRecord`) to align with the current logging handler approach.

## Review Notes
- The post remains a high-level guide rather than a complete production SNMP trap listener. The trap example still assumes surrounding trap parsing functions such as `extract_trap_oid` and `extract_varbinds`.
- The SNMP receiver is currently documented as an alpha metrics component in OpenTelemetry Collector Contrib.
- YAML snippets and Python snippets were syntax-checked locally. Collector config execution was not run because the local workspace does not have the Go toolchain installed.
