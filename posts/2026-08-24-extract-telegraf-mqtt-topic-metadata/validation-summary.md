# Validation Summary: How to Extract Measurement Names, Tags, and Fields from MQTT Topics in Telegraf

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Telegraf `inputs.mqtt_consumer`
- MQTT topic names, filters, and wildcards
- Telegraf value input data format
- Telegraf topic parsing and Influx line protocol
- Telegraf pivot processor and merge aggregator

## Sources Consulted
- [Telegraf MQTT consumer input plugin documentation](https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/)
- [Telegraf collect-data-from-MQTT example](https://docs.influxdata.com/telegraf/v1/examples/collect-mqtt/)
- [Telegraf v1.39.3 MQTT topic parser source](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/mqtt_consumer/topic_parser.go)
- [Telegraf v1.39.3 MQTT consumer source](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/mqtt_consumer/mqtt_consumer.go)
- [Telegraf v1.39.3 MQTT consumer sample configuration](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/mqtt_consumer/sample.conf)
- [Telegraf v1.39.3 metric mutation implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/metric/metric.go)
- [Telegraf value input data format documentation](https://docs.influxdata.com/telegraf/v1/data_formats/input/value/)
- [Telegraf command and flag documentation](https://docs.influxdata.com/telegraf/v1/commands/)
- [Telegraf service-input testing guidance](https://docs.influxdata.com/telegraf/v1/configure_plugins/input_plugins/)
- [Telegraf v1.39.3 pivot processor source](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/processors/pivot/pivot.go)
- [Telegraf pivot processor documentation](https://docs.influxdata.com/telegraf/v1/processor-plugins/pivot/)
- [Telegraf merge aggregator documentation](https://docs.influxdata.com/telegraf/v1/aggregator-plugins/merge/)
- [MQTT Version 5.0, section 4.7: Topic Names and Topic Filters](https://docs.oasis-open.org/mqtt/mqtt/v5.0/os/mqtt-v5.0-os.html#_Toc3901241)

## Issues Found
- The first output example omitted the MQTT consumer's default `topic` tag. The example now includes the tag and states that global tags and the timestamp are omitted.
- The relationship between parser blocks and subscribed topic filters was imprecise. The post now explains that every block matching an incoming topic runs in declaration order and that later mappings can overwrite earlier values.
- Field-collision behavior was described as something to test rather than as deterministic behavior. The post now states that topic fields are applied after payload parsing and overwrite same-key payload fields.
- The isolated `topic_tag = ""` snippet did not identify its required TOML scope. The post now says to place it in the parent `[[inputs.mqtt_consumer]]` table before nested topic-parsing tables.
- The wildcard wording omitted that MQTT's multi-level `#` wildcard must be final in a subscription filter and blurred it with Telegraf's separate mapping syntax. The wording now distinguishes the two uses and uses Telegraf's documented "once per setting" constraint.
- The pivot section implied that `processors.pivot` combines separate MQTT messages into one wide point. It now explains that pivot rewrites each metric independently and that `aggregators.merge` is required to merge compatible metrics into one point.

## Review Notes
- The Telegraf v1.39.3 rendered sample configuration says `unit` for a topic-derived unsigned integer, but the implementation accepts `uint`; the post correctly identifies this documentation typo.
- The reviewed `float` and `integer` value-parser settings, MQTT connection options, persistent-session settings, `topic_tag` behavior, and `--test --test-wait` command syntax are valid for Telegraf v1.39.3.
- All external links in the post resolved to the intended official documentation or tagged source during validation.
