# Validation Summary: How to Monitor SNMP Devices with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry Collector SNMP receiver
- OpenTelemetry OTLP HTTP exporter
- SNMPv1, SNMPv2c, and SNMPv3
- Net-SNMP `snmpwalk`
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib SNMP receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/snmpreceiver/README.md
- OpenTelemetry Collector Contrib SNMP receiver README for v0.98.0: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.98.0/receiver/snmpreceiver/README.md
- OpenTelemetry Collector receivers documentation: https://opentelemetry.io/docs/collector/components/receiver/
- OpenTelemetry Collector configuration documentation, including environment variable expansion: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector releases latest tag: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.153.0
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- Net-SNMP `snmpwalk` tutorial: https://www.net-snmp.org/tutorial/tutorial-5/commands/snmpwalk.html
- RFC 3414, User-based Security Model for SNMPv3: https://www.rfc-editor.org/rfc/rfc3414
- RFC 3416, SNMP protocol operations: https://www.rfc-editor.org/rfc/rfc3416.html

## Issues Found
- The post said the SNMP receiver supports both SNMPv2c and SNMPv3. Current and v0.98.0 receiver docs list SNMPv1, SNMPv2c, and SNMPv3, so the wording was updated.
- The install commands used the old `v0.98.0` Collector release while telling readers to replace it with the latest version. The commands were updated to `v0.153.0`, the current latest release verified on 2026-06-05.
- The SNMP receiver examples defined attribute OIDs inline under `column_oids.attributes`. The receiver schema expects `column_oids.attributes` to reference names from a top-level `attributes` map, so each example now defines `attributes.interface.name` once and references it by name.
- Collector environment variable references used `${VAR}`. Current Collector documentation uses `${env:VAR}`, so SNMP and OneUptime credential references were updated.
- OneUptime OTLP HTTP exporter examples omitted `encoding: json` and the JSON content type documented by OneUptime. The exporter snippets now include `encoding: json` and `Content-Type: application/json`.
- `interface.oper_status` used `unit: ""`, which the current SNMP receiver rejects as a missing unit. It was changed to `unit: "1"` for a dimensionless status value.

## Review Notes
All three full Collector YAML snippets were extracted from the post and validated with `otelcol-contrib validate` using OpenTelemetry Collector Contrib `0.153.0` and dummy environment variables. The snippets passed schema validation after the fixes. Device-specific Cisco OIDs remain examples and should still be verified against each target device with `snmpwalk`, as the post already notes.
