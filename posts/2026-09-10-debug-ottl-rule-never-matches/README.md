# Debug an OTTL Rule That Parses but Never Matches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Find why a valid OTTL rule never matches by inspecting input types, attribute placement, processor order, and condition evaluation.

A Collector that starts successfully has accepted your OTTL syntax. It has not proved that any incoming record satisfies the condition. When a transformation never appears in your backend, investigate the actual input at the processor and then reduce the condition until the mismatch becomes clear.

The examples use OpenTelemetry Collector Contrib **0.160.0**. Work with synthetic or sanitized telemetry because detailed debug output can include complete attribute values and log bodies.

## Confirm the Processor Is Running in the Pipeline

A processor declared under `processors` does nothing until a service pipeline references its component ID. The suffix is part of that ID:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318
processors:
  transform/diagnose:
    error_mode: ignore
    trace_statements:
      - set(span.attributes["diagnostic.reached"], true)
      - set(span.attributes["diagnostic.matched"], true) where resource.attributes["service.name"] == "checkout" and span.attributes["http.response.status_code"] == 500
exporters:
  debug:
    verbosity: detailed
service:
  telemetry:
    logs:
      level: debug
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/diagnose]
      exporters: [debug]
```

Start this isolated configuration and send one test span. `diagnostic.reached` is unconditional. If it is missing, investigate traffic routing, the enabled pipeline, or an earlier processor before changing the condition.

The [transform troubleshooting guide](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#troubleshooting) describes debug logging that includes statement evaluation and transformation context. This is especially useful when the exporter output alone cannot explain the mismatch.

## Inspect Placement and Type

A backend can display resource attributes beside span attributes, but their OTTL paths differ. `service.name` usually appears under `resource.attributes`; a span-level attribute with the same key is a separate value.

Likewise, the integer `500` differs from the string `"500"`. A producer that writes the wrong type can make an otherwise reasonable equality condition fail. Inspect the OTLP data or detailed debug output instead of inferring the type from a dashboard label.

For a temporary diagnostic, copy the raw candidate values to clearly named fields:

```yaml
processors:
  transform/candidates:
    error_mode: ignore
    trace_statements:
      - set(span.attributes["diagnostic.service"], resource.attributes["service.name"]) where resource.attributes["service.name"] != nil
      - set(span.attributes["diagnostic.status"], span.attributes["http.response.status_code"]) where span.attributes["http.response.status_code"] != nil
      - set(span.attributes["diagnostic.status_is_string"], IsString(span.attributes["http.response.status_code"]))
```

Keep this on a test pipeline and remove the diagnostic attributes after investigating. Avoid copying whole resource maps or bodies merely to inspect one field.

## Reduce the Predicate in Stages

First test only the service name. Then add the status condition. Finally add any path or regex constraints. This locates the failing assumption without changing several things at once.

Also check semantic convention migrations. Older HTTP instrumentation may populate `http.status_code`; current instrumentation uses `http.response.status_code`. The [HTTP migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/) documents the mapping. Do not silently convert every unfamiliar key based only on a similar name.

If you use a group-level `conditions` list, its entries are combined with OR. Two entries do not express an AND requirement. Put the conjunction into one condition when both facts must hold:

```yaml
processors:
  transform/selected:
    error_mode: ignore
    trace_statements:
      - conditions:
          - resource.attributes["service.name"] == "checkout" and span.attributes["http.response.status_code"] == 500
        statements:
          - set(span.attributes["diagnostic.selected"], true)
```

A statement's own `where` still applies after the group is selected. Look at both levels before concluding that the collector ignored a predicate.

## Account for Earlier Mutations

Conditions evaluate the telemetry as it exists at that point. If an earlier processor deletes `http.response.status_code`, the later rule sees no value. If an earlier statement renames a span or normalizes a route, a later expression must match the new form.

Move the debug exporter into a separate local reproduction or temporarily simplify the pipeline to identify which stage changes the input. Avoid adding multiple debug exporters to production without considering the data volume and content they expose.

For regexes, check case sensitivity, anchors, and escaping. A condition matching `^/health$` should not match `/health/`. That may be the correct behavior, rather than a bug. Test both strings explicitly.

## Verify Positive and Negative Cases

Use at least four test spans: the exact intended match, a different service with the same status, the same service with another status, and a span missing the candidate attribute. Only the first should receive the final marker.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Compare the marker count with the submitted fixture count, then remove temporary diagnostics and repeat the fixture using the final transformation. This catches a common mistake where the diagnostic version works but the restored condition does not.

## Conclusion

Separate pipeline reachability from condition truth. Inspect the actual attribute location and type, reduce the predicate, and account for earlier changes. A small positive-and-negative fixture gives stronger evidence than repeatedly editing a rule while watching a production dashboard.

## Official Documentation

- [Transform troubleshooting and group conditions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [OTTL language](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/pkg/ottl/LANGUAGE.md)
- [HTTP semantic convention migration](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/)
