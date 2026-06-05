# Validation Summary: How to Configure the SNMP Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- SNMP receiver
- SNMP v1, v2c, and v3
- OTLP HTTP exporter
- Collector processors: resource, batch, memory_limiter, filter
- Kubernetes Deployment and ConfigMap manifests
- net-snmp command-line tools
- Cisco, Juniper, and Linux SNMP configuration examples

## Sources Consulted
- OpenTelemetry Collector Contrib SNMP receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/snmpreceiver
- OpenTelemetry Collector Contrib SNMP receiver raw README: https://raw.githubusercontent.com/open-telemetry/opentelemetry-collector-contrib/main/receiver/snmpreceiver/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- RFC 1213, Management Information Base for Network Management of TCP/IP-based internets: MIB-II: https://datatracker.ietf.org/doc/html/rfc1213
- RFC 2790, Host Resources MIB: https://datatracker.ietf.org/doc/html/rfc2790
- RFC 1628, UPS Management Information Base: https://datatracker.ietf.org/doc/html/rfc1628
- `otel/opentelemetry-collector-contrib:latest` `validate` command, run locally against the complete Collector config examples.

## Issues Found
- The SNMP receiver examples used an invalid list-based `metrics` schema with `oid` and `name` fields. Updated examples to the current map-based SNMP receiver schema using metric names as keys and `scalar_oids` or `column_oids`.
- SNMP versions were shown as `2c` and `3`, but the receiver documents `v1`, `v2c`, and `v3`. Updated Collector examples accordingly.
- SNMP v3 security levels used GoSNMP-style values such as `authPriv`; the Collector receiver expects `auth_priv`, `auth_no_priv`, or `no_auth_no_priv`. Updated Collector examples while leaving `snmpwalk` CLI syntax unchanged.
- String SNMP values were shown as metric gauges with `value_type: string`, but the receiver metric value type supports only `int` and `double`. Moved `system.description` to `resource_attributes`.
- Interface counters and error counters were shown as gauges. Updated them to monotonic cumulative sums, which better matches SNMP counter semantics.
- Current Collector environment variable substitution uses `${env:NAME}`. Updated Collector configuration snippets from `${NAME}` to `${env:NAME}`.
- Resource processor examples omitted `action`; added `action: upsert`.
- The timeout troubleshooting snippet included unsupported `retries`; removed it and kept the documented `timeout` setting.
- The table-walk explanation implied `indexed_value_prefix` creates separate metric names. Updated it to explain that it creates indexed attribute values attached to datapoints.
- The high-cardinality filter example matched interface indexes in metric names, but those indexes are attributes, not metric-name suffixes. Reworded and changed the example to drop whole metric families by name.

## Review Notes
The complete basic, production, and multi-device Collector configuration examples were validated with `otelcol-contrib validate` from the latest `otel/opentelemetry-collector-contrib` Docker image. The SNMP receiver is still marked alpha in the contrib documentation, so future Collector releases may change the receiver schema.
