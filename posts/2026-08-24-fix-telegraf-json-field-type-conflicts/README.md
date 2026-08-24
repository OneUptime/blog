# Fix Telegraf JSON `field type conflict` Without Dropping Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, InfluxDB, JSON, Data Quality, Troubleshooting

Description: Prevent InfluxDB field conflicts by enforcing a stable type at the Telegraf parser boundary and quarantining incompatible schema changes instead of losing writes.

---

A JSON producer may emit `42`, `42.0`, and `"42"` for the same property. JSON defines the first two as numbers and the third as a string. In Telegraf 1.39.3, `json_v2` emits untyped JSON numbers as float fields, while an explicit `type = "int"` or another input can produce an integer field. A number-versus-string change or inconsistent explicit typing across inputs can therefore create a conflict. The destination's enforcement scope depends on the InfluxDB product and schema mode: InfluxDB OSS TSM requires a measurement field key to keep one type within a shard (types can differ across shards), Cloud TSM documents implicit-schema conflicts against the same series, and products or buckets with explicit schemas enforce their declared field types. A mismatch in the applicable scope can produce a partial-write or field-type-conflict rejection.

The durable fix is not to retry the same invalid point. Define a canonical type before the metric reaches the output, and handle values that cannot conform through an explicit quarantine or schema version.

## Confirm the Actual Conflict

Inspect Telegraf's output error, if present, for the measurement, field, received type, and expected type. InfluxDB Cloud (TSM) processes writes asynchronously, so it can return HTTP 204 before later rejecting a point. Query the `rejected_points` measurement in the `_monitoring` bucket for details such as `measurement`, `field`, `gotType`, `wantType`, and `reason`.

Use a temporary file output to see exactly what Telegraf emits:

```toml
[[outputs.file]]
  files = ["stdout"]
  data_format = "influx"
```

Remember the line-protocol distinction:

```text
# integer
sensor value=42i
# float
sensor value=42
# string
sensor value="42"
# boolean
sensor value=true
```

Choose the canonical type from the destination's actual product/version behavior, existing data or explicit schema, and domain meaning-not from whichever sample happens to arrive first. Do not assume that a shard-scoped TSM rule or an explicit bucket schema applies universally to every InfluxDB engine.

## Enforce the Type in `json_v2`

For selected fields, set `type` directly:

```toml
[[inputs.mqtt_consumer]]
  servers = ["tcp://broker.example.com:1883"]
  topics = ["sensors/+/temperature"]
  data_format = "json_v2"

  [[inputs.mqtt_consumer.json_v2]]
    measurement_name = "temperature"

    [[inputs.mqtt_consumer.json_v2.tag]]
      path = "device"

    [[inputs.mqtt_consumer.json_v2.field]]
      path = "value"
      type = "float"

    [[inputs.mqtt_consumer.json_v2.field]]
      path = "quality"
      type = "int"
      optional = true
```

The valid `json_v2` target types are `int`, `uint`, `float`, `string`, and `bool`. With `type = "float"`, the parser converts JSON numbers and numeric strings to float; without an explicit type, numeric strings remain strings. A string that cannot be converted to float in a scalar field returns a parser error. `optional = true` only permits a missing path; it does not suppress conversion errors.

Do not treat `type` as complete domain validation. In Telegraf 1.39.3, a boolean selected with `type = "float"` is left as a boolean instead of causing an error, which can still create a destination conflict. If booleans are possible, reject or quarantine them before `json_v2`, and keep an independent copy of the raw payload if it must be recoverable.

For object mappings, enforce types in the nested fields table:

```toml
[[inputs.file]]
  files = ["readings.json"]
  data_format = "json_v2"

[[inputs.file.json_v2]]
  [[inputs.file.json_v2.object]]
    path = "readings"
    tags = ["device"]

    [inputs.file.json_v2.object.fields]
      value = "float"
      sample_count = "int"
```

Parser-boundary typing handles the expected number and numeric-string variants early, but it does not replace domain validation or raw-event retention.

## Normalize Metrics with the Converter Processor

When several inputs already produce the same logical field, normalize them before outputs:

```toml
[[processors.converter]]
  namepass = ["temperature"]
  order = 1

  [processors.converter.fields]
    float = ["value"]
    integer = ["quality"]
```

`namepass` scopes the processor; other measurements bypass it unchanged. The converter accepts globs, but broad globs can accidentally change unrelated fields. InfluxData documents a critical limitation: values that cannot be converted are dropped. Therefore, a converter alone does not satisfy a requirement to retain malformed new data.

Use it only when the input contract guarantees convertibility, or pair it with a separate raw/quarantine path before conversion.

## Preserve Incompatible New Values

If a producer has legitimately changed the domain type, do not coerce blindly. Use one of these explicit migrations:

- write the new value under a new field such as `value_text` while retaining `value` as float;
- write to a versioned measurement such as `temperature_v2`;
- route the raw event at the ingestion boundary to a quarantine store with its source, timestamp, and validation error; or
- for an explicit Cloud TSM bucket, add the new field column or measurement schema before writing, or backfill transformed history into a new bucket; existing schema columns cannot be modified or deleted.

Changing tags to split series can alter cardinality and does not solve an explicit-schema mismatch; behavior also differs across InfluxDB products and versions. A new field or measurement makes the schema change obvious and queryable.

For a parser failure stream, keep the original message at the broker or source whenever possible. Telegraf metrics do not retain arbitrary raw payloads automatically. Design a dead-letter or archive path at the ingestion boundary if every invalid event must be recoverable.

## Test All Producer Variants Before Deployment

Build fixtures containing:

- integer and decimal JSON numbers;
- numeric strings;
- `null`, missing fields, and empty strings;
- booleans where numeric values are expected;
- values outside the intended numeric range; and
- the first payload after a producer firmware or API-version change.

Run `telegraf --config telegraf.conf --test` and inspect line protocol types. For a service input such as `mqtt_consumer`, add `--test-wait 10` so it has time to receive fixtures. Then test a staging write against a bucket with the same schema. Test mode does not execute outputs, so it cannot reveal a destination-side conflict by itself.

## Official Documentation

- [JSON number grammar (RFC 8259, section 6)](https://www.rfc-editor.org/rfc/rfc8259#section-6)
- [JSON v2 types and conversions](https://docs.influxdata.com/telegraf/v1/data_formats/input/json_v2/)
- [Telegraf 1.39.3 `json_v2` parser implementation](https://github.com/influxdata/telegraf/blob/v1.39.3/plugins/parsers/json_v2/parser.go)
- [Telegraf 1.39.3 `json_v2` type fixtures](https://github.com/influxdata/telegraf/tree/v1.39.3/plugins/parsers/json_v2/testdata/types)
- [Converter processor plugin](https://docs.influxdata.com/telegraf/v1/processor-plugins/converter/)
- [InfluxDB line protocol syntax](https://docs.influxdata.com/influxdb/v2/reference/syntax/line-protocol/)
- [Troubleshoot InfluxDB rejected points and type conflicts](https://docs.influxdata.com/influxdb/cloud/write-data/troubleshoot/)
- [Manage explicit bucket schemas in InfluxDB Cloud (TSM)](https://docs.influxdata.com/influxdb/cloud/admin/buckets/bucket-schema/)
- [InfluxDB OSS v2 field types across TSM shards](https://docs.influxdata.com/influxdb/v2/reference/faq/#how-does-influxdb-handle-field-type-discrepancies-across-shards)
- [Troubleshoot Telegraf and inspect output metrics](https://docs.influxdata.com/telegraf/v1/administer/troubleshoot/)

## Conclusion

Stop expected number-versus-string conflicts at the earliest controlled boundary by assigning a canonical `json_v2` type, and validate wrong-domain values such as booleans before parsing. Use the converter only for guaranteed conversions, because unconvertible values are dropped. When a type change is legitimate or malformed data must be retained, route it to a new schema or recoverable quarantine rather than repeatedly sending an invalid point.
