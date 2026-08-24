# Validation Summary: How to Test Telegraf Service Inputs When `--test` Produces No Metrics

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Telegraf service input plugins
- Telegraf `--test`, `--test-wait`, and `--once` modes
- HTTP Listener v2
- MQTT, StatsD, SNMP traps, and socket listeners
- InfluxDB line protocol
- Telegraf metric filters, processors, internal metrics, and file output
- TOML configuration and cURL

## Sources Consulted

- [Collect data with input plugins](https://docs.influxdata.com/telegraf/v1/configure_plugins/input_plugins/)
- [Telegraf commands and flags](https://docs.influxdata.com/telegraf/v1/commands/)
- [Telegraf configuration file](https://docs.influxdata.com/telegraf/v1/configuration/file/)
- [Troubleshoot Telegraf](https://docs.influxdata.com/telegraf/v1/administer/troubleshoot/)
- [HTTP Listener v2 input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/http_listener_v2/)
- [Influx input data format](https://docs.influxdata.com/telegraf/v1/data_formats/input/influx/)
- [StatsD input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/statsd/)
- [MQTT Consumer input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/mqtt_consumer/), [Socket Listener input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/socket_listener/), and [SNMP Trap input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/snmp_trap/)
- [Filter Telegraf metrics](https://docs.influxdata.com/telegraf/v1/configuration/filtering/)
- [Telegraf Internal input plugin](https://docs.influxdata.com/telegraf/v1/input-plugins/internal/)
- [File output plugin](https://docs.influxdata.com/telegraf/v1/output-plugins/file/)
- [Telegraf v1.39.3 agent finite-run implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/agent/agent.go)
- [Telegraf v1.39.3 StatsD implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/statsd/statsd.go)
- [Telegraf v1.39.3 HTTP Listener v2 implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/inputs/http_listener_v2/http_listener_v2.go)

## Issues Found

- The post originally grouped StatsD with service inputs that emit a deliberately injected event during `--test-wait`. StatsD instead buffers ordinary metric packets until `Gather()` runs, while Telegraf's finite test implementation performs its one gather before the wait and does not perform a final gather. The post now directs readers to test StatsD with the short normal `outputs.file` run and warns that a packet sent during `--test-wait` may not print.
- The post originally implied that common selector filters on processors can remove a metric. Telegraf drops excluded metrics at input and output filters, but a metric excluded by a processor selector bypasses that processor and continues downstream unchanged. The troubleshooting step now distinguishes input filters and metric-changing processors and states the processor-selector behavior explicitly.

## Review Notes

Reviewed against the current Telegraf v1.39.3 documentation and source. The HTTP Listener v2 configuration and cURL stimulus were also executed with the official v1.39.3 container image; the listener returned `204` and test mode printed the expected metric. The CLI flags, integer-second `--test-wait` value, default Linux configuration paths, line protocol, output behavior, finite-run caveat, and `inputs.internal` claims are current and non-deprecated. The post correctly limits an HTTP `204` response to listener acceptance and does not treat it as proof of downstream delivery.
