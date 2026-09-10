# Coalesce Old and New OpenTelemetry Attribute Keys with OTTL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Use OTTL Coalesce to prefer current semantic convention keys while accepting older producers, with explicit precedence and type handling.

During an instrumentation migration, one service may emit `http.method` while another emits `http.request.method`. A compatibility transformation can make downstream queries consistent while both producer versions exist. The key is to choose precedence deliberately and avoid treating unrelated semantic changes as simple renames.

OpenTelemetry Collector Contrib **0.160.0** includes the `Coalesce` converter. It accepts a list and returns the first non-nil value, which fits the common requirement to prefer the current key and fall back to the old one.

## Write the Compatibility Rule

For HTTP request methods whose legacy values already satisfy the current method convention, use the current attribute first:

```yaml
processors:
  transform/http_compatibility:
    error_mode: ignore
    trace_statements:
      - >-
        set(span.attributes["http.request.method"],
        Coalesce([span.attributes["http.request.method"],
        span.attributes["http.method"]]))
        where span.attributes["http.request.method"] != nil or
        span.attributes["http.method"] != nil
```

The guard avoids passing an all-missing result to `set`, making the rule independent of nil-setting feature-gate behavior. The list order says the new key wins if both exist.

The [Coalesce source](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_coalesce.go) and [function reference](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#coalesce) define the first-non-nil behavior. The [HTTP migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) supplies the key mapping, but also changes method normalization. Methods unknown to the instrumentation must map to `_OTHER`; canonicalizing a method's case can also require `http.request.method_original`. Handle those rules upstream according to the [HTTP method convention](https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/). Copying an arbitrary legacy value is not a complete semantic migration.

If your deployed distribution does not contain `Coalesce`, validate before rollout. A fallback for this particular mapping is a conditional copy from the old field only when the new one is absent.

## Make the Precedence Visible

The rule behaves as follows:

| Current key | Old key | Result |
|---|---|---|
| `GET` | Missing | `GET` |
| Missing | `POST` | `POST` |
| `PUT` | `POST` | `PUT` |
| Missing | Missing | No new attribute |
| Empty string | `GET` | Empty string |

An empty string, zero, or false is not nil. `Coalesce` does not automatically reject empty, malformed, or incorrectly typed candidates. A producer emitting the wrong current value can therefore take precedence over a usable legacy value.

For a strictly typed compatibility layer, validate the producer schema or use guarded branches that express the desired fallback policy. Do not casually delete an existing current field to force a fallback; that can erase evidence of a producer bug.

Likewise, avoid a default method such as `GET` or `unknown` unless your output contract explicitly calls for it. Absence is often more honest than inventing a request attribute for a non-HTTP span.

## Keep Resource and Span Paths Separate

A resource convention migration uses resource paths. For example:

```yaml
processors:
  transform/environment_compatibility:
    error_mode: ignore
    trace_statements:
      - >-
        set(resource.attributes["deployment.environment.name"],
        Coalesce([resource.attributes["deployment.environment.name"],
        resource.attributes["deployment.environment"]]))
        where resource.attributes["deployment.environment.name"] != nil or
        resource.attributes["deployment.environment"] != nil
```

This reads and writes resource data without deriving the value from an individual span. A log pipeline needs the corresponding signal section if it receives separate telemetry and requires the same compatibility rule.

Changing a resource attribute can affect grouping and queries. Roll out the mapping consistently across signals rather than assuming a trace-only transformation updates the logs and metrics produced by the same application.

## Do Not Generalize Renames into Semantic Conversion

HTTP convention changes also include metric names, units, and differences in what fields represent. Copying a duration from a millisecond-based metric into a seconds-based metric name without scaling the data is incorrect.

URLs also have distinct meanings: a full URL, a path, a route template, and a query string are not interchangeable just because each is a string. `Coalesce` chooses a present value; it cannot determine whether two fields mean the same thing.

Retain old keys temporarily if consumers still rely on them. Once all dashboards and exporters use the new schema, a separate cleanup can remove legacy keys. Combining compatibility and deletion in one rollout makes it harder to diagnose which change broke a consumer.

## Verify with Both Producer Generations

Use a fixture containing old-only, new-only, conflicting, empty, missing, and wrong-type values. Attach the processor to a local traces pipeline with a detailed debug exporter.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Inspect the type as well as the printed value. Confirm the new key wins in the conflict case, the old key supplies the missing case, and unrelated spans remain untouched. Check the rendered configuration rather than only the source template.

After rollout, measure how much telemetry still needs the fallback. That gives you evidence for retiring the compatibility rule when all producers have migrated, rather than maintaining duplicate attributes indefinitely.

## Conclusion

Use `Coalesce` for verified equivalent fields, put the preferred key first, and define how empty and wrong-type values should behave. Keep resource mappings separate and treat unit or meaning changes as real conversions. A compatibility layer should make a migration observable and temporary.

## Official Documentation

- [Coalesce implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/func_coalesce.go)
- [Coalesce function contract](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/ottlfuncs/README.md#coalesce)
- [HTTP convention migration](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/)
