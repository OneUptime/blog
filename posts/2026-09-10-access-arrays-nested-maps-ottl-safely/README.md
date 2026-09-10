# Access Arrays and Nested Maps Safely in OTTL Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Logging, Observability, Troubleshooting

Description: Guard OTTL nested map and array access with parent type checks and bounds checks so mixed structured logs do not cause runtime errors.

Structured logs often contain optional objects and lists. A path such as `log.body["events"][0]["type"]` works only when every parent has the expected shape and the list contains an element. A missing field and an empty list are different situations, and neither should be handled by hoping a converter returns a harmless default.

This guide uses OpenTelemetry Collector Contrib **0.160.0**. The examples use map-valued OTLP log bodies and explicit guards around each structural assumption.

## Start with the Actual Data Shape

Assume the body is this object:

```json
{
  "request": {"id": "r-17"},
  "events": [
    {"type": "payment", "status": "accepted"}
  ]
}
```

`request` is a map, `events` is a list, and the first event is another map. Integer indexes are zero-based. A string body containing this JSON is still a string until you parse it.

The [OTTL path grammar](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/LANGUAGE.md#paths) and [log context paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottllog/README.md) describe bracket access to nested values. A dotted key such as `request.id` is a literal key unless you explicitly traverse separate map entries.

## Guard a Nested Map from the Outside In

Copy the request identifier only when the parents and leaf have the expected types:

```yaml
processors:
  transform/request_id:
    error_mode: ignore
    log_statements:
      - >-
        set(log.attributes["request.id"], log.body["request"]["id"])
        where IsMap(log.body) and
        IsMap(log.body["request"]) and
        IsString(log.body["request"]["id"])
```

The order is deliberate. Establish that the body is a map before reading `request`, then establish that `request` is a map before reading `id`. OTTL boolean evaluation short-circuits, so later dependent checks are not evaluated after an earlier `and` term fails.

A check for `log.body["request"] != nil` alone is insufficient. The value could exist as a string, integer, or list and still fail the map-shaped contract.

## Check List Type Before Length and Index

Select the first event with a complete guard:

```yaml
processors:
  transform/first_event:
    error_mode: ignore
    log_statements:
      - >-
        set(log.attributes["example.first_event_type"],
        log.body["events"][0]["type"])
        where IsMap(log.body) and
        IsList(log.body["events"]) and
        Len(log.body["events"]) > 0 and
        IsMap(log.body["events"][0]) and
        IsString(log.body["events"][0]["type"])
```

`Len` accepts supported strings, lists, and maps, but errors for inappropriate types. The list check therefore precedes both length and index access. The index check precedes reading the element's fields.

The [IsList, IsMap, IsString, and Len contracts](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md) make each condition's responsibility explicit.

Do not use index zero as a stand-in for searching the entire list. The rule says the first event matters. If the payment event can occur anywhere, choose a supported collection operation or reshape the producer output to expose the field you need. Some newer collection features have experimental gates, so verify their status before adopting them.

## Parse JSON Strings into Cache

When the producer sends JSON text, stage parsing and selection in one group:

```yaml
processors:
  transform/json_events:
    error_mode: ignore
    log_statements:
      - context: log
        statements:
          - set(log.cache["parsed"], ParseJSON(log.body)) where IsString(log.body)
          - >-
            set(log.attributes["example.first_event_type"],
            log.cache["parsed"]["events"][0]["type"])
            where IsMap(log.cache["parsed"]) and
            IsList(log.cache["parsed"]["events"]) and
            Len(log.cache["parsed"]["events"]) > 0 and
            IsMap(log.cache["parsed"]["events"][0]) and
            IsString(log.cache["parsed"]["events"][0]["type"])
```

Malformed JSON can still fail the first statement. With `ignore`, the record survives, the cache does not contain the parsed object, and the extraction guard skips the second statement.

The original body stays unchanged. This avoids surprising consumers that expect string bodies while still making one derived field searchable.

## Test Structural Counterexamples

Use fixtures with the valid example, a plain string body, a missing `events` key, an empty list, a list of strings, a first map missing `type`, and a numeric `type` value. Every malformed shape should be retained without the derived attribute.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Attach the selected processor to a logs pipeline with a detailed debug exporter. Inspect runtime errors as well as exported fields: a rule that silently skips after an error may look similar to a correctly guarded rule in the backend.

Also test a body with a literal key named `events.0.type`. It should not satisfy the nested-path rule. This catches assumptions introduced by log viewers that flatten object paths for display.

## Conclusion

Check parent types before child access and list bounds before indexing. Keep JSON parsing and cache consumers together, and distinguish a first-element rule from a list search. Structural negative fixtures prove that mixed log formats are handled deliberately rather than through accidental error suppression.

## Official Documentation

- [OTTL path and expression grammar](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/LANGUAGE.md)
- [Type and length functions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md)
- [Log body and cache access](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/contexts/ottllog/README.md)
