# Validation Summary: Fix Telegraf JSON `field type conflict` Without Dropping Points

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Telegraf 1.39.3
- Telegraf `json_v2` input parser
- Telegraf converter processor and file output
- Telegraf CLI test mode
- MQTT consumer and file input plugins
- JSON and InfluxDB line protocol
- InfluxDB OSS v2 TSM
- InfluxDB Cloud (TSM), including implicit and explicit bucket schemas

## Sources Consulted

- [RFC 8259, section 6: Numbers](https://www.rfc-editor.org/rfc/rfc8259#section-6)
- [Telegraf JSON v2 input data format](https://docs.influxdata.com/telegraf/v1/data_formats/input/json_v2/)
- [Telegraf 1.39.3 `json_v2` parser source](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/parsers/json_v2/parser.go)
- [Telegraf 1.39.3 `json_v2` type fixtures](https://github.com/influxdata/telegraf/tree/v1.39.3/plugins/parsers/json_v2/testdata/types)
- [GJSON 1.19.0 numeric value handling](https://github.com/tidwall/gjson/blob/v1.19.0/gjson.go)
- [Telegraf converter processor documentation](https://docs.influxdata.com/telegraf/v1/processor-plugins/converter/)
- [Telegraf 1.39.3 converter source](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/processors/converter/converter.go)
- [Telegraf 1.39.3 processor ordering and metric filtering](https://github.com/influxdata/telegraf/blob/v1.39.3/docs/CONFIGURATION.md#processor-plugins)
- [Telegraf commands and flags](https://docs.influxdata.com/telegraf/v1/commands/)
- [Telegraf input plugin testing guide](https://docs.influxdata.com/telegraf/v1/configure_plugins/input_plugins/)
- [Telegraf file output documentation](https://docs.influxdata.com/telegraf/v1/output-plugins/file/)
- [InfluxDB line protocol syntax](https://docs.influxdata.com/influxdb/v2/reference/syntax/line-protocol/)
- [InfluxDB Cloud (TSM) write troubleshooting and rejected-points schema](https://docs.influxdata.com/influxdb/cloud/write-data/troubleshoot/)
- [InfluxDB Cloud (TSM) explicit bucket schemas](https://docs.influxdata.com/influxdb/cloud/admin/buckets/bucket-schema/)
- [InfluxDB OSS v2 field types across TSM shards](https://docs.influxdata.com/influxdb/v2/reference/faq/#how-does-influxdb-handle-field-type-discrepancies-across-shards)

## Issues Found

- The type-conversion paragraph could be read as claiming that `json_v2` always converts numeric strings to floats. Numeric strings remain strings unless a target type is configured. The text now ties number and numeric-string conversion explicitly to `type = "float"` and states the untyped behavior. This prevents readers from expecting an implicit string-to-number conversion.

## Review Notes

- The examples were exercised with the official Telegraf 1.39.3 binary. The scalar and object TOML configurations loaded successfully; untyped JSON numbers emitted float fields, explicit integer and float conversions emitted the intended line protocol types, a Boolean configured as `float` remained Boolean, a missing optional path was skipped, and a non-convertible numeric string produced a parser error.
- The converter configuration also loaded and ran successfully. A failed conversion removes the selected field value rather than necessarily dropping the entire metric, which is consistent with the post's wording that unconvertible values are dropped and with its recommendation to retain raw data through a separate path.
- The rolling `json_v2` documentation currently says that untyped integer-shaped JSON numbers remain integers, but the pinned Telegraf 1.39.3 implementation, tagged fixture, and binary emit them as floats. The post correctly limits this claim to 1.39.3 and cites the tagged evidence. The current documentation recommends `xpath_json` for new configurations, especially those involving arrays; `json_v2` remains supported.
- `order = 1` is valid. If the deployment has additional processors and their relative ordering matters, all relevant processors should set `order`; processors without an order run before ordered processors.
- All links in the post resolved successfully and pointed to the described official or authoritative resources.
