# Validation Summary: How to Preserve Device Timestamps in Telegraf JSON Without Nanosecond, Time-Zone, or Precision Errors

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Telegraf 1.39.3
- Telegraf `mqtt_consumer` and `file` input plugins
- Telegraf `json_v2` input parser and GJSON paths
- JSON and TOML
- MQTT
- Go time layouts and RFC 3339 timestamps
- Unix timestamps at second, millisecond, microsecond, and nanosecond precision
- InfluxDB TSM and InfluxDB 3 duplicate-point behavior

## Sources Consulted

- [Telegraf JSON v2 input data format](https://docs.influxdata.com/telegraf/v1/data_formats/input/json_v2/)
- [Telegraf v1.39.3 JSON v2 parser implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/parsers/json_v2/parser.go)
- [Telegraf v1.39.3 timestamp parsing implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/internal/internal.go#L252-L360)
- [Parse incoming data with Telegraf](https://docs.influxdata.com/telegraf/v1/configure_plugins/input_plugins/parse-data/)
- [Common Telegraf plugin options](https://docs.influxdata.com/telegraf/v1/configuration/plugin-options/)
- [Telegraf MQTT Consumer input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/)
- [Testing Telegraf input configurations](https://docs.influxdata.com/telegraf/v1/configure_plugins/input_plugins/#test-an-input-configuration)
- [Telegraf v1.39.3 service-input and test-mode precision implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/agent/agent.go#L345-L469)
- [Telegraf v1.39.3 timestamp rounding implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/agent/accumulator.go#L79-L84)
- [Telegraf v1.39.3 configuration loader](https://github.com/influxdata/telegraf/blob/v1.39.3/config/config.go#L1698-L1844)
- [Telegraf change that introduced `time_source`](https://github.com/influxdata/telegraf/commit/56f2d6e1bb6440246f52ee11a93bc9730de1cda4)
- [Official Telegraf Docker image](https://hub.docker.com/_/telegraf)
- [Go `time` package layouts and parsing](https://pkg.go.dev/time)
- [RFC 3339](https://www.rfc-editor.org/rfc/rfc3339)
- [InfluxDB Cloud TSM duplicate-point behavior](https://docs.influxdata.com/influxdb/cloud/write-data/best-practices/duplicate-points/)
- [InfluxDB 3 Core line protocol and duplicate points](https://docs.influxdata.com/influxdb3/core/reference/line-protocol/)
- [InfluxDB 3 Enterprise line protocol and duplicate points](https://docs.influxdata.com/influxdb3/enterprise/reference/line-protocol/)

## Issues Found

- The post described `metric`, `collection_start`, and `collection_end` as usable values of the documented common `time_source` option. The stock Telegraf 1.39.3 image rejects an explicit `time_source` on polling inputs such as `file` and `cpu` as an unused field. The configuration loader reads the setting, but its common-field allow-list omits it; current upstream master has the same gap. The paragraph was changed to state the effective default behavior—parsed metric timestamps remain unchanged—and to retain the correct instruction to omit `time_source` from the MQTT service input.

## Review Notes

- The exact RFC 3339 parser configuration was run with the official Telegraf 1.39.3 image. `2026-08-24T09:15:30.125+01:00` emitted the correct line-protocol timestamp, `1787559330125000000` nanoseconds. The equivalent `unix_ms` value, `1787559330125`, emitted the same instant.
- Runtime fixtures confirmed that a configured missing or null root `timestamp_path` returns a parser error, while a path selecting an array or object retains the current time. This differs from the hosted JSON v2 page's missing-query wording but matches the v1.39.3 implementation and test fixtures.
- An object-array fixture confirmed that an element without `timestamp_key` inherits the parsed root timestamp. A service-input fixture confirmed that normal operation applies configured timestamp rounding while `--test` preserves nanosecond precision.
- Go accepts an optional, variable-length fractional second with a `.999999999` layout and truncates precision beyond nanoseconds.
- Current Telegraf documentation recommends `xpath_json` for new configurations, especially array-heavy ones. `json_v2` remains supported, and the post is accurate for configurations that use it.
