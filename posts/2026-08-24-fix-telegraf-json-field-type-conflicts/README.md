# How to Fix Telegraf JSON `field type conflict` Errors Without Dropping New Points

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, InfluxDB, JSON, Data Quality, Troubleshooting

Description: Prevent InfluxDB field conflicts by enforcing a stable type at the Telegraf parser boundary and quarantining incompatible schema changes instead of losing writes.

---

A JSON producer may emit `42`, `42.0`, and `"42"` for the same property. Those values are an integer, float, and string. `json_v2` preserves the JSON type unless configured otherwise. The destination's enforcement scope depends on the InfluxDB product and schema mode: TSM engines require a consistent field type within a shard (types can differ across shards), while products or buckets with explicit schemas enforce their declared field types. A mismatch in the applicable scope can produce a partial-write or field-type-conflict rejection.

The durable fix is not to retry the same invalid point. Define a canonical type before the metric reaches the output, and handle values that cannot conform through an explicit quarantine or schema version.

## Confirm the Actual Conflict

Inspect Telegraf's output error for the measurement, field, received type, and expected type. On InfluxDB Cloud (TSM), rejected points are also recorded in the `_monitoring` bucket with details such as `measurement`, `field`, `gotType`, `wantType`, and `reason`.

Use a temporary file output to see exactly what Telegraf emits:

```toml
[[outputs.file]]
  files = ["stdout"]
  data_format = "influx"
```

Remember the line-protocol distinction:

```text
sensor value=42i      # integer
sensor value=42       # float
sensor value="42"    # string
sensor value=true     # boolean
```

Choose the canonical type from the destination's actual product/version behavior, existing data or explicit schema, and domain meaning—not from whichever sample happens to arrive first. Do not assume that a shard-scoped TSM rule or an explicit bucket schema applies universally to every InfluxDB engine.

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

The valid `json_v2` target types are `int`, `uint`, `float`, `string`, and `bool`. The parser can convert integers and numeric strings to float. If an explicitly typed value cannot be converted, parsing fails visibly rather than emitting a conflicting type.

For object mappings, enforce types in the nested fields table:

```toml
[[inputs.file.json_v2]]
  [[inputs.file.json_v2.object]]
    path = "readings"
    tags = ["device"]

    [inputs.file.json_v2.object.fields]
      value = "float"
      sample_count = "int"
```

Parser-boundary typing is preferable because malformed payloads never enter the pipeline under the wrong schema.

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
- route the raw event to a quarantine output with its source, timestamp, and validation error; or
- transform historical data and migrate the bucket schema through a planned backfill.

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

Run `telegraf --test` and inspect line protocol types. Then test a staging write against a bucket with the same schema. Test mode does not execute outputs, so it cannot reveal a destination-side conflict by itself.

## Official Documentation

- [JSON v2 types and conversions](https://docs.influxdata.com/telegraf/v1/data_formats/input/json_v2/)
- [Converter processor plugin](https://docs.influxdata.com/telegraf/v1/processor-plugins/converter/)
- [Troubleshoot InfluxDB rejected points and type conflicts](https://docs.influxdata.com/influxdb/cloud/write-data/troubleshoot/)
- [InfluxDB OSS v2 field types across TSM shards](https://docs.influxdata.com/influxdb/v2/reference/faq/#how-does-influxdb-handle-field-type-discrepancies-across-shards)
- [Troubleshoot Telegraf and inspect output metrics](https://docs.influxdata.com/telegraf/v1/administer/troubleshoot/)

## Conclusion

Stop type conflicts at the earliest controlled boundary by assigning a canonical `json_v2` type. Use the converter only for guaranteed conversions, because unconvertible values are dropped. When a type change is legitimate or malformed data must be retained, route it to a new schema or recoverable quarantine rather than repeatedly sending an invalid point.
