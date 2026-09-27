# How to Migrate Legacy Data Prepper Trace Processor Names to the Event Model

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Observability

Description: Migrate legacy Data Prepper trace processor names while preserving typed span events, buffer sizing, and service-map outputs.

---

A Data Prepper trace migration can fail even when every YAML key parses successfully. Older pipelines passed OpenTelemetry request objects through several stages; newer pipelines process individual event-model spans. Processor names, source behavior, buffer units, and generic transforms therefore need to be reviewed together.

Treat this as a data-contract migration. Renaming a processor is one part of the change, not the entire upgrade.

## Separate removed plugins from deprecated aliases

The official [trace analytics migration guide](https://docs.opensearch.org/latest/data-prepper/common-use-cases/trace-analytics/) describes the transition introduced in Data Prepper 1.4 and completed in 2.0. Version 1.4 allowed `otel_trace_source` to emit events with `record_type: event`; version 2.0 made event output mandatory and removed that setting.

Use this inventory when reviewing an old pipeline:

| Legacy configuration | Migration action |
|---|---|
| `otel_traces_prepper` | Replace with `otel_traces` for event spans |
| `otel_traces_group_prepper` | Verify the release and use the registered `otel_trace_group` lookup plugin |
| `record_type: event` | Use only for the transitional 1.x configuration; remove for 2.x |
| `otel_trace_raw` | Prefer the current `otel_traces` name |
| `service_map_stateful` | Prefer the current `service_map` name |

The migration guide uses the plural spelling `otel_traces_group`, but the [group processor registration](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-trace-group-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltracegroup/OTelTraceGroupProcessor.java) uses the singular `otel_trace_group`. Prefer the name registered by the installed release; do not assume the plural spelling is an alias.

The last two names are a different case from the removed `*_prepper` plugins. The current upstream registrations declare `otel_trace_raw` and `service_map_stateful` as deprecated aliases. Check the registrations in the [trace processor](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-trace-raw-processor/src/main/java/org/opensearch/dataprepper/plugins/processor/oteltrace/OTelTraceRawProcessor.java) and [service-map processor](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/service-map-stateful/src/main/java/org/opensearch/dataprepper/plugins/processor/ServiceMapStatefulProcessor.java) for the deployed version rather than assuming all old names have identical support.

## Record the current contract before editing

Capture the exact Data Prepper image version, entry source, processor list, pipeline connections, and sink index types. Save a small representative trace fixture containing a root, a child from another service, a status code, and resource and span attributes.

Record the resulting raw-span fields and expected service relationship. Include a child that arrives before its root if that ordering occurs in production. The fixture gives you something concrete to compare after the migration.

Also identify any processor that parses JSON or rebuilds an event from a map. Trace processors consume typed span events. A document that merely contains fields called `traceId` and `spanId` is not necessarily a compatible span object.

## Update the processor fragments

For a transitional 1.4 installation, the source fragment was:

```yaml
source:
  otel_trace_source:
    record_type: event
```

For Data Prepper 2.x and later, remove `record_type` and keep the source's actual TLS and authentication settings:

```yaml
source:
  otel_trace_source:
    ssl: true
    sslKeyCertChainFile: /etc/data-prepper/otel-cert.pem
    sslKeyFile: /etc/data-prepper/otel-key.pem
```

Use these current processor names in the appropriate downstream branches:

```yaml
# Raw span branch
processor:
  - otel_traces: {}

# Service-map branch: a separate pipeline
# processor:
#   - service_map: {}
```

If the old pipeline used group lookup, migrate that processor too and preserve its configured OpenSearch connection and credentials. Do not add `otel_trace_group` solely because it appears in an example; it serves a distinct backend-lookup purpose.

Core peer forwarding is configured in `data-prepper-config.yaml` for modern multi-node deployments. Review the [Data Prepper 2.0 announcement](https://opensearch.org/blog/announcing-data-prepper-2-0-0/) when replacing a legacy forwarding processor arrangement.

## Recalculate buffer units

Suppose an older request record carried 50 spans. A capacity of 1,000 request records represented a very different span budget from a capacity of 1,000 individual span events. The migration guide specifically calls out scaling buffer and batch sizes for the changed record granularity.

Use the old request-size distribution to estimate a starting capacity, then measure the new implementation. Do not multiply a historical buffer size by the largest imaginable batch and deploy that value without a heap check.

Check all branches: an entry pipeline feeding raw and map pipelines introduces multiple buffering and processing stages. Changes in batch size also affect per-worker work and the size of downstream bulk requests.

## Keep output-format migration separate

Modern trace sources offer `opensearch` and `otel` output formats, while the unified `otlp` source has its own defaults. That choice is not the same as the 1.x-to-2.x event-model transition. The [trace source reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/) documents the format option.

First preserve the intended document shape and compatible sink template. Then evaluate a format migration as another change with its own field-path and dashboard checks. Combining both migrations makes a changed attribute path look like a processor failure.

## Validate the resulting behavior

Run the fixture against the candidate deployment. Compare unique span IDs, parent-child relationships, service names, trace groups, and expected service-map edges. Check source, processor, buffer, and sink errors, including type-cast exceptions.

A successful startup proves plugin configuration was accepted. It does not prove the new pipeline handles the same number of spans, preserves the same attributes, or writes documents the selected Dashboards dataset understands.

## Conclusion

Migrate removed plugins, normalize deprecated names, and verify the event contract end to end. Keep record granularity and document format explicit so a syntactically valid upgrade also preserves usable traces.
