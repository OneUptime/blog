# How to Extract Measurement Names, Tags, and Fields from MQTT Topics in Telegraf

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, MQTT, IoT, Metric Parsing, Observability

Description: Map positional MQTT topic segments into stable Telegraf measurement names, tags, and typed fields while parsing the payload independently.

---

MQTT topic paths often contain the metric schema that a bare payload lacks. A message on `sensors/line-a/device-17/temperature` with payload `21.6` already encodes a measurement, line, device, and metric kind. Telegraf's `inputs.mqtt_consumer.topic_parsing` maps those topic segments into metric names, tags, and fields without a custom script.

Topic parsing is separate from payload parsing. `data_format` determines how the message body becomes fields; `topic_parsing` enriches or renames the metric using the MQTT topic.

## Map a Stable Topic Schema

For topics shaped as `sensors/<line>/<device>/temperature`:

```toml
[[inputs.mqtt_consumer]]
  servers = ["ssl://broker.example.com:8883"]
  topics = ["sensors/+/+/temperature"]
  qos = 1
  client_id = "telegraf-factory-temperature"
  persistent_session = true

  data_format = "value"
  data_type = "float"

  [[inputs.mqtt_consumer.topic_parsing]]
    topic = "sensors/+/+/temperature"
    measurement = "_/_/_/measurement"
    tags = "_/line/device/_"
```

For topic `sensors/line-a/device-17/temperature` and payload `21.6`, the important output shape is:

```text
temperature,line=line-a,device=device-17 value=21.6
```

Each slash-delimited token in `measurement`, `tags`, and `fields` aligns with a topic level. `_` ignores a level. A name assigns that segment to the corresponding metric component.

The `topic` inside a parsing block selects which subscribed topic pattern the mapping applies to. Define multiple blocks when subscriptions have different schemas.

## Extract Typed Fields from the Topic

Suppose a publisher sends an alarm value in the payload and encodes a threshold in `alarms/<site>/<device>/<kind>/<threshold>`:

```toml
[[inputs.mqtt_consumer]]
  servers = ["tcp://broker.example.com:1883"]
  topics = ["alarms/+/+/+/+"]
  data_format = "value"
  data_type = "integer"

  [[inputs.mqtt_consumer.topic_parsing]]
    topic = "alarms/+/+/+/+"
    measurement = "measurement/_/_/_/_"
    tags = "_/site/device/kind/_"
    fields = "_/_/_/_/threshold"

    [inputs.mqtt_consumer.topic_parsing.types]
      threshold = "float"
```

The current Telegraf implementation accepts `int`, `uint`, and `float` in `topic_parsing.types`; a segment with no type entry remains a string. The rendered sample configuration currently says `unit`, but the v1.39.3 source and validation logic use `uint`. Treat that sample word as a documentation typo, check the source for the Telegraf version you deploy, and make numeric intent explicit so a threshold does not become a string unexpectedly.

Topic-derived fields are added alongside fields parsed from the payload. Avoid giving both sources the same field key unless the overwrite behavior is deliberately tested.

## Control the Full Topic Tag

By default the MQTT consumer stores the complete topic in a tag named `topic`. That is useful for troubleshooting, but highly variable topic paths can increase series cardinality. Once positional tags are proven sufficient, disable it explicitly:

```toml
topic_tag = ""
```

Do not discard the full topic until you have confirmed the extracted tags uniquely identify the device and route. Keep volatile values such as request IDs, timestamps, or readings out of tags; make them fields where appropriate.

## Handle Variable-Length Topics Carefully

MQTT subscriptions use `+` for one topic level and `#` for any number of levels. Topic parsing also documents `_` for ignored levels and `#` for one variable-length portion, usable once per mapping. Variable schemas are harder to reason about and can map the wrong end segment after firmware changes.

Prefer separate explicit parsing blocks for each versioned topic layout:

```toml
topics = [
  "sensors/v1/+/+/temperature",
  "sensors/v2/+/+/+/temperature",
]
```

Version the resulting tags or measurement when the semantic meaning changes, not merely the path length.

## Pivot Only When You Need Wide Metrics

The official MQTT example shows topic segments such as `temp`, `rpm`, and `ph` becoming a `field` tag, followed by `processors.pivot` to turn the payload's `value` field into multiple fields on one measurement:

```toml
[[processors.pivot]]
  tag_key = "field"
  value_key = "value"
```

Pivoting is appropriate only when metrics share the same measurement, remaining tag set, and timestamp grouping. Otherwise, keep narrow metrics and preserve their natural event times.

## Test the Mapping with Real Topics

Run Telegraf with a file output or `--test --test-wait <seconds>`, publish one unique message for every pattern, and inspect the exact line protocol. Include tests for unexpected depth, empty segments, wildcard boundaries, numeric conversion failures, and overlapping parsing blocks.

Service inputs may not emit during a short one-shot test, so publish only after the MQTT consumer has connected and allow enough wait time.

## Official Documentation

- [MQTT consumer input plugin and topic parsing](https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/)
- [Telegraf MQTT topic parser source](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/mqtt_consumer/topic_parser.go)
- [Collect data from MQTT example](https://docs.influxdata.com/telegraf/v1/examples/collect-mqtt/)
- [Value input data format](https://docs.influxdata.com/telegraf/v1/data_formats/input/value/)
- [Pivot processor plugin](https://docs.influxdata.com/telegraf/v1/processor-plugins/pivot/)

## Conclusion

Treat the MQTT topic as a versioned positional schema. Parse the payload with the appropriate data format, map stable topic levels into measurements and low-cardinality tags, type topic fields explicitly, and verify every subscribed pattern with representative messages before removing the diagnostic full-topic tag.
