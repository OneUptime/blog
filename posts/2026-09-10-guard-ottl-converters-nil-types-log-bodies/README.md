# Guard OTTL Converters Against Nil and Mixed Log Body Types

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Handle missing fields, invalid JSON, map bodies, and arrays with guarded OTTL converters while preserving unparseable log records.

A log pipeline rarely receives one perfect body shape forever. One library emits JSON strings, another sends an OTLP map, and an error handler writes plain text. Applying the same converter to all three creates avoidable runtime errors and can drop telemetry if the processor propagates them.

This guide uses OpenTelemetry Collector Contrib **0.160.0**. The goal is to extract an order identifier when the input supports it while keeping other records useful and unchanged.

## Separate Existence, Type, and Validity

These are different questions:

1. Is a value present?
2. Is it the type the converter accepts?
3. Does its content satisfy the converter's format?

`value != nil` answers only the first. `IsString(value)` answers the second for string converters. Neither proves that a string is valid JSON, a timestamp, or a number.

The [OTTL function documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#parsejson) states that `ParseJSON` can return a map or slice and reports errors for malformed input. A successful parse therefore does not automatically make the result suitable for `merge_maps`.

## Normalize into a Temporary Cache

Keep the conversion and consumers of its result in one log-context group:

```yaml
processors:
  transform/order_logs:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - set(log.cache["record"], log.body) where IsMap(log.body)
          - set(log.cache["record"], ParseJSON(log.body)) where IsString(log.body) and IsMatch(log.body, "^[[:space:]]*\\{")
          - set(log.attributes["order.id"], log.cache["record"]["order_id"]) where IsMap(log.cache["record"]) and IsString(log.cache["record"]["order_id"])
```

An existing map can be copied into the cache directly. A string that looks like an object is offered to the JSON parser. A parsed array does not satisfy the map guard on the final statement.

The opening-brace check is an inexpensive candidate filter, not JSON validation. A body such as `{broken` passes it and still produces a parse error. `error_mode: ignore` retains the record and logs that error. This is suitable when extraction is optional.

The cache is temporary working data and is not exported as an attribute. Keeping all dependent statements in the same group avoids relying on cache state across separate context passes.

## Promote Only the Fields You Intend to Use

Copying selected fields is easier to control than merging an entire body into log attributes. An application could introduce a high-cardinality field, a nested array, or a key that conflicts with existing telemetry metadata.

If a controlled object really should be merged, guard the parsed result itself:

```yaml
processors:
  transform/controlled_merge:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - set(log.cache["parsed"], ParseJSON(log.body)) where IsString(log.body)
          - merge_maps(log.attributes, log.cache["parsed"], "insert") where IsMap(log.cache["parsed"])
```

The `insert` strategy preserves attributes already on the record. Use `upsert` only when the parsed object is supposed to overwrite them. Neither strategy makes arbitrary application fields safe for export.

A log body map can represent structured data that is intentionally different from a flat attribute set. Retaining the body while extracting two or three searchable fields often produces a clearer schema.

## Guard Nested Access from the Outside In

For nested objects, establish each parent type before reading its child:

```yaml
processors:
  transform/nested:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - set(log.attributes["customer.id"], log.body["customer"]["id"]) where IsMap(log.body) and IsMap(log.body["customer"]) and IsString(log.body["customer"]["id"])
```

This permits a map body with a map-valued customer and a string identifier. A string body, absent customer, or integer identifier fails a guard. The [OTTL boolean evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/boolean_value.go) implements short-circuit evaluation, so place the protective tests before dependent accesses.

If your contract permits integer identifiers, add a separate conversion branch and document the resulting string format. Do not assume every converter performs the same automatic coercions as `IsMatch`.

## Exercise the Failure Cases Deliberately

Build a fixture with a valid JSON object, malformed object text, plain text, a map body, a JSON array, an empty body, and an object containing a numeric `order_id`. Record the expected extraction behavior before running the Collector.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Attach the processor to the logs pipeline and use a detailed debug exporter on sanitized input. Check that all records survive, only supported identifiers are copied, and the body remains unchanged. Also inspect the error log for the malformed candidate so you know the failure is visible.

If malformed JSON becomes common, fix the source format or route known text logs around parsing. Switching to `silent` can reduce noise, but it does not repair data quality or prove the parsing rule still succeeds.

## Conclusion

Check presence, type, and content separately. Stage parsing in cache, guard the parsed result, and promote only the fields your output schema needs. Representative malformed inputs are essential to verify that optional enrichment remains optional when real log formats vary.

## Official Documentation

- [OTTL converter contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [OTTL grammar and boolean expressions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/LANGUAGE.md)
- [Log context and cache](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottllog/README.md)
