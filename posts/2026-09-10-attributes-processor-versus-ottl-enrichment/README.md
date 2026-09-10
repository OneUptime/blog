# Choose the Attributes Processor or OTTL for Simple Enrichment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Monitoring

Description: Choose the attributes processor for simple ordered attribute actions and OTTL for context-aware conditions, body parsing, and field transformations.

A constant attribute does not need a complicated transformation program. The attributes processor can insert, update, copy, convert, or delete attributes with a short list of actions. OTTL becomes useful when the decision depends on telemetry context, structured bodies, or fields outside an attribute map.

This comparison targets OpenTelemetry Collector Contrib **0.160.0**. Choose the smallest processor whose behavior clearly expresses your enrichment requirement, then test its conflict and missing-value behavior.

## Use Ordered Actions for Simple Attribute Changes

Suppose spans need a default pipeline label and a renamed customer-tier attribute:

```yaml
processors:
  attributes/enrichment:
    actions:
      - key: example.pipeline
        value: application
        action: insert
      - key: customer.tier
        from_attribute: legacy.customer_tier
        action: insert
      - key: legacy.customer_tier
        action: delete
```

`insert` preserves an existing destination. The copy does nothing when the source attribute is missing. The final action removes the legacy key, so order matters.

Use `upsert` if the pipeline should overwrite an existing value, or `update` if the action should affect only records that already contain the key. The [attributes processor documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/attributesprocessor/README.md) defines those actions and their ordering.

In this example, deleting the legacy key is intentional even when `customer.tier` already exists. If conflicting values need investigation, keep the legacy key until you have a conflict policy rather than deleting that evidence immediately.

## Choose the Right Attribute Level

The attributes processor operates on signal attributes: span attributes, log attributes, and metric data point attributes. It is not the resource processor. A deployment-wide resource value such as an environment name belongs in resource enrichment:

```yaml
processors:
  resource/environment:
    attributes:
      - key: deployment.environment.name
        value: production
        action: insert
```

Choose the exact resource value from your deployment context rather than copying the example blindly. Hard-coding `production` in a shared Collector that receives multiple environments would mislabel telemetry.

A backend may display resource and span attributes together, but that does not make their data-model roles interchangeable. Decide where the information belongs before choosing the processor.

## Use OTTL When the Rule Needs More Context

For enrichment based on the parent resource and HTTP status, OTTL makes the dependency explicit:

```yaml
processors:
  transform/checkout_errors:
    error_mode: ignore
    trace_statements:
      - set(span.attributes["example.support_queue"], "payments") where resource.attributes["service.name"] == "checkout" and span.attributes["http.response.status_code"] == 500
```

The attributes processor has include and exclude matching capabilities, so it is not limited to completely unconditional changes. OTTL is useful when expressions, type guards, parent contexts, and transformations become central to the rule.

Other reasons to choose OTTL include parsing a JSON log body, setting log severity or event time, renaming a metric, or deriving a span name. Those are not ordinary copy operations between keys in the same attribute map.

The [transform processor configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md) describes signal-specific paths and context inference. That flexibility also means a reviewer must understand exactly which level is being changed.

## Compare the Requirements Directly

| Requirement | Starting choice |
|---|---|
| Add a constant only when absent | Attributes `insert` |
| Copy one existing signal attribute | Attributes `from_attribute` |
| Set a deployment resource attribute | Resource processor |
| Parse or restructure a log body | Transform with OTTL |
| Set a field based on multiple contexts | Transform with OTTL |
| Convert a metric's type or aggregate points | A suitable metric transform, with semantic review |

The attributes processor's `hash` action uses SHA1 in this release. If the requirement explicitly calls for SHA256, use the appropriate OTTL converter or a suitable upstream component instead of assuming all hash actions use the same algorithm.

Likewise, changing metric data point attributes can create identity conflicts. Neither a short attributes action list nor an OTTL `delete_key` automatically aggregates measurements that become indistinguishable after a label is removed.

## Verify Pipeline Wiring and Conflict Behavior

A declared processor must be referenced by its exact component ID:

```yaml
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes/enrichment]
      exporters: [debug]
```

Combine this wiring with your receiver, processor, and exporter definitions. Use a local fixture with a missing destination, an existing destination, a missing source, and conflicting source and destination values.

```bash
otelcol-contrib validate --config collector.yaml
otelcol-contrib --config collector.yaml
```

Check the output against the intended insert or overwrite policy. For the OTTL example, include a checkout error, a successful checkout span, another service's error, and a span missing the status attribute.

If receiver metadata is the source, review `from_context` and the receiver's metadata settings. Transport headers are not automatically trustworthy enrichment data, and copying a header into an attribute does not authenticate its contents.

## Conclusion

Use the attributes processor for clear, ordered actions on signal attributes and the resource processor for resource metadata. Choose OTTL when context, conditions, or non-attribute fields require it. The best configuration is the one whose missing-value and overwrite behavior a reviewer can verify from a small fixture.

## Official Documentation

- [Attributes processor actions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/attributesprocessor/README.md)
- [Transform processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md)
- [Resource processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/resourceprocessor/README.md)
