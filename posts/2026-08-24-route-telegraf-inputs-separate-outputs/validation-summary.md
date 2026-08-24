# Validation Summary: How to Route Different Telegraf Inputs to Separate Outputs with `tagpass`, `namepass`, and Aliases

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Telegraf 1.39.3
- Telegraf metric filters (`tagpass`, `tagexclude`, `namepass`, `namedrop`, and `metricpass`)
- Telegraf input, output, processor, internal, and secret-store plugins
- TOML configuration
- InfluxDB v2 output
- InfluxDB line protocol, HTTP, and JSON data formats

## Sources Consulted

- [Telegraf v1.39.3 release](https://github.com/influxdata/telegraf/releases/tag/v1.39.3)
- [Filter Telegraf metrics](https://docs.influxdata.com/telegraf/v1/configuration/filtering/)
- [Route metrics to different outputs](https://docs.influxdata.com/telegraf/v1/examples/route-metrics/)
- [Common Telegraf plugin options](https://docs.influxdata.com/telegraf/v1/configuration/plugin-options/)
- [Write data with output plugins](https://docs.influxdata.com/telegraf/v1/configure_plugins/output_plugins/)
- [Use secrets in Telegraf configurations](https://docs.influxdata.com/telegraf/v1/configuration/secrets/)
- [CPU input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/cpu/)
- [HTTP input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/http/)
- [InfluxDB v2 output plugin](https://docs.influxdata.com/telegraf/v1/output-plugins/influxdb_v2/)
- [File output plugin](https://docs.influxdata.com/telegraf/v1/output-plugins/file/)
- [HTTP output plugin](https://docs.influxdata.com/telegraf/v1/output-plugins/http/)
- [JSON input data format](https://docs.influxdata.com/telegraf/v1/data_formats/input/json/)
- [InfluxDB line protocol output data format](https://docs.influxdata.com/telegraf/v1/data_formats/output/influx/)
- [Telegraf commands and run modes](https://docs.influxdata.com/telegraf/v1/commands/)
- [Monitor Telegraf with the internal input plugin](https://docs.influxdata.com/telegraf/v1/administer/monitor/)
- [Telegraf v1.39.3 output filtering, aliases, and buffers source](https://github.com/influxdata/telegraf/blob/v1.39.3/models/running_output.go)

## Issues Found

- The InfluxDB examples referenced `@{secrets:influx_token}` without stating that `secrets` must be the ID of a configured secret-store plugin. Without that store and key, Telegraf fails configuration loading with an unknown-secret-store error. Added the required prerequisite before the example; the reference syntax and the `influxdb_v2` plugin's secret-capable `token` option are otherwise correct.
- The deployment advice suggested watching `internal_write` without explaining that Telegraf emits those self-metrics only when `[[inputs.internal]]` is enabled. In the tag-based example, the two outputs would also reject untagged internal metrics. Updated the advice to enable the internal input and give its metrics a matching route, or send them to a separate monitoring output. Also made the alias-statistics sentence explicitly refer to the internal input.

## Review Notes

- The remaining routing claims and snippets are correct for Telegraf 1.39.3. The combined plugin configuration was loaded with the official v1.39.3 binary using a dummy literal token to isolate configuration validation from the documented secret-store prerequisite.
- `tagpass` conditions across different tag keys are ORed, selectors run before modifiers, and each output filters an output-owned metric copy. The post's `tagpass` plus `tagexclude` pattern therefore selects on `route` before stripping it and does not prevent another output from evaluating its own filter.
- The `json` parser remains supported and is appropriate when the HTTP endpoint returns flat JSON containing usable fields. More complex JSON payloads may require `json_v2` or `xpath_json`, but that does not invalidate the example.
- All Markdown links in the post resolved; the four links in the Official Documentation section point to the intended current InfluxData documentation pages.
