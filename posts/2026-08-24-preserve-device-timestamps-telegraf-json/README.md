# How to Preserve Device Timestamps in Telegraf JSON Without Nanosecond, Time-Zone, or Precision Errors

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, JSON, Timestamps, IoT, InfluxDB

Description: Parse device event time explicitly, choose the correct epoch unit or Go layout, and prevent later precision rounding from collapsing distinct metrics.

---

When a device includes its own observation time, using Telegraf's receipt time changes ordering whenever networks buffer, retry, or deliver events late. Preserving the source timestamp requires three decisions to agree: the JSON path, the timestamp's unit or layout, and any precision applied later in the pipeline.

A timestamp error is often syntactically valid. Treating milliseconds as seconds can place a point thousands of years away, while treating nanoseconds as milliseconds can overflow or produce an invalid time. If `timestamp_path` is omitted, Telegraf uses the current time; a configured root path that is missing or null is a parse error in current releases. Validate the emitted nanosecond timestamp, not just whether parsing succeeded.

## Parse an RFC 3339 Device Timestamp

Given this MQTT payload:

```json
{
  "device_id": "sensor-17",
  "observed_at": "2026-08-24T09:15:30.125+01:00",
  "temperature_c": 21.75,
  "battery_ok": true
}
```

configure `json_v2` with a Go reference-time layout:

```toml
[[inputs.mqtt_consumer]]
  servers = ["ssl://mqtt.example.com:8883"]
  topics = ["sensors/+/status"]
  data_format = "json_v2"
  precision = "1ns"

  [[inputs.mqtt_consumer.json_v2]]
    measurement_name = "device_status"
    timestamp_path = "observed_at"
    timestamp_format = "2006-01-02T15:04:05.999999999Z07:00"

    [[inputs.mqtt_consumer.json_v2.tag]]
      path = "device_id"
      rename = "device"

    [[inputs.mqtt_consumer.json_v2.field]]
      path = "temperature_c"
      type = "float"

    [[inputs.mqtt_consumer.json_v2.field]]
      path = "battery_ok"
      type = "bool"
```

Go layouts describe the example time `Mon Jan 2 15:04:05 MST 2006`; they are not `strftime` patterns. `Z07:00` accepts either `Z` or a numeric offset. Fractional seconds are parsed even when the layout's seconds portion does not explicitly show a fraction, but including `.999999999` makes the expected shape clear and accepts variable fractional precision.

`timestamp_timezone` applies only to formatted timestamps that do not contain an offset. A timestamp with `+01:00` already identifies its instant. Prefer RFC 3339 with `Z` or an explicit offset over a local wall-clock string, especially across daylight-saving transitions.

## Match the Epoch Unit Exactly

For numeric device time, choose one of the parser's four supported epoch formats:

| Approximate digits for current dates | Meaning | `timestamp_format` |
| --- | --- | --- |
| 10 | seconds | `"unix"` |
| 13 | milliseconds | `"unix_ms"` |
| 16 | microseconds | `"unix_us"` |
| 19 | nanoseconds | `"unix_ns"` |

For example, a millisecond value needs:

```toml
  [[inputs.mqtt_consumer.json_v2]]
    measurement_name = "device_status"
    timestamp_path = "observed_at_ms"
    timestamp_format = "unix_ms"
```

Unix epoch values identify UTC instants, so a timezone setting does not shift them. Do not multiply a millisecond value in an external script and also declare `unix_ms`; convert exactly once.

The digit-count test is a diagnostic heuristic, not schema validation. Document the device contract and test boundary values because early epochs, negative timestamps, strings, and firmware changes can defeat the heuristic.

## Treat Missing and Naive Times Deliberately

If a root `timestamp_path` is omitted, `json_v2` uses the current time. If it is configured but the GJSON query is missing or resolves to null, current Telegraf returns a parse error instead of emitting a metric. A query that selects an array or object rather than one value retains the current time. Send fixtures with the property present, missing, null, malformed, and the wrong shape, and decide how the application should handle each case.

For local strings with no offset, supply an IANA timezone:

```toml
timestamp_path = "observed_at"
timestamp_format = "2006-01-02 15:04:05"
timestamp_timezone = "Europe/London"
```

`UTC` is the parser default. `Local` uses the Telegraf host's timezone and can make identical device data resolve differently across hosts, containers, or configuration changes. An IANA zone applies historical daylight-saving rules, but some wall times are ambiguous or nonexistent during clock transitions; fix the producer to send an offset whenever possible.

For arrays of objects, put `timestamp_key`, `timestamp_format`, and `timestamp_timezone` on the relevant `[[...json_v2.object]]` table so each array element carries its own time. An element missing `timestamp_key` retains the root timestamp, or the current time if no root timestamp was configured.

## Preserve Precision Through the Input

Telegraf leaves a parsed metric timestamp unchanged by default. Service inputs such as MQTT do not use `time_source`, so omit it from `mqtt_consumer`.

The input `precision` option rounds timestamps. On a service input, coarse precision can make separate events land on the same measurement, tag set, and timestamp. `precision = "1ns"` makes the intent explicit for nanosecond preservation; choose a coarser value only when the source contract and destination schema allow it.

In InfluxDB, points with the same measurement, tag set, and timestamp are duplicates. TSM-based InfluxDB unions their fields and lets later matching field keys win; InfluxDB 3 duplicate handling has product-specific overwrite caveats. Do not depend on timestamp rounding to aggregate events.

## Validate the Actual Instant

Run a fixture through the same parser and inspect line protocol:

```bash
telegraf --config ./timestamp-test.conf --test --test-wait 10
```

Because MQTT is a service input, publish the fixture during the wait window or test the parser through a file input using the same `json_v2` block. Test mode forces nanosecond precision for service-input events, so it validates MQTT parsing but not production rounding from a coarser input `precision`; check that with a short normal run and a file output. Convert the emitted nanoseconds independently and compare the result with the device's documented instant. Include a non-UTC offset, maximum supported fractional precision, consecutive events within one millisecond, and a daylight-saving boundary when local time is unavoidable.

Finally, compare device clocks with a trusted time source. Correct parser syntax cannot repair a drifting producer clock.

## Official Documentation

- [Telegraf JSON v2 input parser](https://docs.influxdata.com/telegraf/v1/data_formats/input/json_v2/)
- [Parse incoming data with Telegraf](https://docs.influxdata.com/telegraf/v1/configure_plugins/input_plugins/parse-data/)
- [Common Telegraf input options: `precision` and `time_source`](https://docs.influxdata.com/telegraf/v1/configuration/plugin-options/#input-plugin-options)
- [Go time layouts and parsing](https://pkg.go.dev/time#pkg-constants)
- [InfluxDB duplicate points](https://docs.influxdata.com/influxdb/cloud/write-data/best-practices/duplicate-points/)

## Conclusion

Preserve device time by selecting the exact JSON value, declaring its real epoch unit or Go layout, including an offset or intentional timezone, and leaving the metric timestamp at sufficient precision. Test missing properties and boundary times, then verify the emitted nanosecond instant independently before production writes.
