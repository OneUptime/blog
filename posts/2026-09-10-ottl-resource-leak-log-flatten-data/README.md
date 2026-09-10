# Prevent OTTL Resource Changes Leaking Across Log Records

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OpenTelemetry Collector, OTTL, Observability, Troubleshooting

Description: Understand shared log resources and use the transform.flatten.logs feature gate with flatten_data to isolate per-record resource changes.

Two log records can carry different tenant attributes while sharing the same resource object. If an OTTL rule copies each tenant into that resource, the last write can affect both records. The rule is syntactically valid, but its mutation happens at a different level from its input.

OpenTelemetry Collector Contrib **0.160.0** provides a log-specific solution through `flatten_data` and the `transform.flatten.logs` feature gate. Use it when a resource truly needs to be derived from individual records, and measure the additional processing cost.

## Reproduce the Shared-Resource Problem

Consider one resource with `service.name=log-gateway` and two records:

```text
Resource: service.name=log-gateway
  Log A: attributes tenant.id=alpha
  Log B: attributes tenant.id=beta
```

This rule reads a child value and mutates its shared parent:

```yaml
processors:
  transform/shared_resource:
    error_mode: ignore
    log_statements:
      - set(resource.attributes["tenant.id"], log.attributes["tenant.id"]) where IsString(log.attributes["tenant.id"])
```

Both records initially refer to the same resource. A final exported resource value does not necessarily describe the tenant of each original record. Changing statement order cannot create separate resource ownership.

The [transform flattening documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#transformflattenlogs) describes this exact class of parent-resource mutation.

## Decide Whether the Value Belongs on the Resource

Resource attributes describe the entity producing telemetry. A per-request tenant, user, or order may belong on the log record instead. If your query only needs to filter tenant IDs, retaining `log.attributes["tenant.id"]` can be sufficient.

If a gateway receives telemetry on behalf of multiple actual services, deriving a service identity from each record can be necessary. Confirm the source field is trustworthy and that changing the resource matches the intended data model. An arbitrary request header should not be allowed to masquerade as an authenticated service identity.

This distinction also affects cardinality. Splitting a resource for every order ID can create a huge number of resource groups with little benefit.

## Enable Isolation Explicitly

For a local demonstration, use this complete configuration:

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 127.0.0.1:4318
processors:
  transform/isolate:
    error_mode: ignore
    flatten_data: true
    log_statements:
      - set(resource.attributes["tenant.id"], log.attributes["tenant.id"]) where IsString(log.attributes["tenant.id"])
exporters:
  debug:
    verbosity: detailed
service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [transform/isolate]
      exporters: [debug]
```

Run validation and the Collector with the gate enabled:

```bash
otelcol-contrib validate --config collector.yaml --feature-gates=transform.flatten.logs
otelcol-contrib --config collector.yaml --feature-gates=transform.flatten.logs
```

Do not assume `flatten_data: true` alone enables the feature. Keep the launch arguments with the configuration in deployment review and test the exact distribution you run.

The processor creates distinct resource and scope copies for individual log records, applies transformations, and then regroups records with equal resulting resource and scope. Logs whose resources remain equal can therefore share a group again afterward.

This feature applies to logs. It is not a general isolation switch for spans or metric data points, and it does not parse JSON or flatten nested body maps.

## Test More Than the Happy Path

Submit one OTLP request containing the two tenants under a single resource. Expect two exported resource groups, one with `alpha` and one with `beta`, with each original record attached to the correct group.

Then send two records with the same tenant and identical scope metadata. They can regroup together after transformation. Add a third record without `tenant.id`; the guard should leave its resource without the new tenant attribute.

Use one incoming resource in the fixture. Sending each record in a separate resource group would hide the original problem and make a broken configuration appear correct.

Also test scope changes if your rules derive instrumentation scope fields from records. Isolation covers both resource and scope, and regrouping depends on their final contents.

## Place It Before the First Dependent Resource Mutation

If an earlier processor has already overwritten a shared resource using record-specific values, later flattening cannot reconstruct the original association. Put isolation in the transform processor that performs the child-derived mutation, before the damage occurs.

Measure CPU, memory, and exporter behavior with representative resource sizes and record batches. Per-record copying and regrouping add work. The overhead depends on how many attributes are copied and how diverse the final resources become.

Avoid treating `flatten_data` as a universal setting to turn on without a reason. When a field belongs on each record, keeping it there is simpler and avoids splitting resource groups unnecessarily.

## Conclusion

A child log value can overwrite a parent resource shared by sibling records. Use record attributes when that matches the data model; use the gated `flatten_data` option when per-record resource changes are intentional. Verify isolation with multiple records inside one incoming resource and measure the cost before broad rollout.

## Official Documentation

- [Log flattening feature gate](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/README.md#transformflattenlogs)
- [Transform configuration source](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.160.0/processor/transformprocessor/config.go)
- [OpenTelemetry resource data model](https://opentelemetry.io/docs/concepts/resources/)
