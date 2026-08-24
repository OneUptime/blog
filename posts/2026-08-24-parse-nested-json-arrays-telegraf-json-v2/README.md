# How to Parse Nested JSON Arrays in Telegraf with `json_v2` and GJSON Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Telegraf, JSON, GJSON, Data Parsing, Observability

Description: Turn nested JSON arrays into correctly typed Telegraf metrics by selecting the right object, preserving parent context, and verifying the expanded line protocol.

---

Telegraf's `json_v2` parser maps JSON into measurement names, tags, fields, and timestamps with GJSON paths. The important array rule is simple: every array element becomes a separate metric, while the non-array values of its containing object are carried along. The rule applies recursively.

That behavior is powerful, but an imprecise `object.path` can produce surprising metric counts or lose the relationship between parallel arrays. Design the desired line protocol first, then map one logical reading to one metric.

## Start with a Known Payload Shape

Consider a batch with gateway context and a nested readings array:

```json
{
  "batch": {
    "site": "london",
    "readings": [
      {
        "device": "sensor-17",
        "kind": "temperature",
        "value": 21.6,
        "observed_at": 1787560200123
      },
      {
        "device": "sensor-18",
        "kind": "temperature",
        "value": "22.1",
        "observed_at": 1787560201123
      }
    ]
  }
}
```

The target is two metrics, each retaining the parent `site` and its own device, type, value, and timestamp.

## Select the Parent Object and Let Arrays Expand

The following file-input example works with any parser-capable input; for MQTT, replace the table prefix with `inputs.mqtt_consumer`:

```toml
[[inputs.file]]
  files = ["/tmp/readings.json"]
  data_format = "json_v2"

  [[inputs.file.json_v2]]
    measurement_name = "device_reading"

    [[inputs.file.json_v2.object]]
      path = "batch"
      tags = ["site", "readings_device", "readings_kind"]
      included_keys = [
        "site",
        "readings_device",
        "readings_kind",
        "readings_value",
        "readings_observed_at",
      ]
      timestamp_key = "readings_observed_at"
      timestamp_format = "unix_ms"

      [inputs.file.json_v2.object.renames]
        readings_device = "device"
        readings_kind = "kind"
        readings_value = "value"

      [inputs.file.json_v2.object.fields]
        readings_value = "float"
```

Nested keys are underscore-prefixed by default, hence `readings_device`. The `renames` table makes the emitted schema concise. The `fields` map forces both the JSON number `21.6` and numeric string `"22.1"` to a float. If conversion is impossible, parsing fails instead of silently changing the field's type.

The expected shape is:

```text
device_reading,site=london,device=sensor-17,kind=temperature value=21.6 1787560200123000000
device_reading,site=london,device=sensor-18,kind=temperature value=22.1 1787560201123000000
```

Telegraf represents metric timestamps internally in nanoseconds, so the millisecond input is scaled in the printed line protocol.

## Choose `object`, `field`, and `tag` Correctly

Use an `object` table for an object or array whose structure becomes metrics. A `field` or `tag` table is for selecting a single scalar or an array of scalars. If a top-level `field` path uses GJSON `#` and returns an array, it produces one metric per value, but separate field and tag tables do not preserve relationships between their arrays.

That distinction matters for payloads like this:

```json
{"devices":["a","b"],"values":[10,20]}
```

Do not assume two independent array selections zip by position. Prefer an array of objects such as `[{
"device":"a","value":10},{"device":"b","value":20}]`, then select it with an object table.

## Use GJSON Paths Deliberately

GJSON paths use dots for object traversal and `#` for array projection. Develop the selection against representative payloads, including empty arrays, missing optional properties, and multiple elements. A path that returns an object is ignored by a simple `field` or `tag`; use `object` for structures.

`optional = true` suppresses missing-path errors, which is useful when one MQTT subscription receives multiple documented shapes. It can also hide a typo, so make required schema elements non-optional and use separate parser blocks or plugin instances when payload families differ substantially.

Avoid `disable_prepend_keys = true` unless bare nested names are genuinely unique. InfluxData warns that duplicate nested key names overwrite one another when parent prefixes are disabled.

## Validate Cardinality, Types, and Time

For each fixture, assert:

- the number of output metrics equals the intended logical readings;
- parent tags are present on every expanded element;
- field types are stable across all variants;
- the timestamp unit matches `unix`, `unix_ms`, `unix_us`, or `unix_ns`; and
- missing or malformed required values produce a visible error.

Run Telegraf test mode against fixture files and inspect the exact line protocol. Outputs do not run in `--test`, which is useful here because the exercise is parser validation.

## Know the Current Recommendation

`json_v2` remains documented and useful for existing GJSON-based configurations. Current InfluxData documentation recommends `xpath_json` for new configurations, especially for nested documents and arrays. Prefer `xpath_json` when starting fresh or when relationships are cumbersome to express; do not migrate a stable `json_v2` pipeline without fixture-based equivalence tests.

## Official Documentation

- [JSON v2 input data format](https://docs.influxdata.com/telegraf/v1/data_formats/input/json_v2/)
- [Choose a Telegraf JSON parser](https://docs.influxdata.com/telegraf/v1/data_formats/input/)
- [Parse incoming data](https://docs.influxdata.com/telegraf/v1/configure_plugins/input_plugins/parse-data/)
- [XPath JSON input data format](https://docs.influxdata.com/telegraf/v1/data_formats/input/xpath_json/)
- [GJSON path syntax](https://github.com/tidwall/gjson#path-syntax)

## Conclusion

Reliable nested-array parsing comes from selecting one containing object, keeping related values in the same array element, and explicitly controlling field types and timestamps. Verify the exact metric count and line protocol with fixtures, and consider `xpath_json` for new array-heavy designs.
