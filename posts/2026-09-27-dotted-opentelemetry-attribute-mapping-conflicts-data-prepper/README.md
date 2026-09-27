# How to Diagnose Dotted OpenTelemetry Attribute Mapping Conflicts in Data Prepper

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Troubleshooting

Description: Trace dotted OpenTelemetry attributes through Data Prepper decoding and OpenSearch mappings to fix scalar-object and schema conflicts.

---

An attribute can be valid OpenTelemetry data and still fail OpenSearch indexing. A common trigger is using both `http` and `http.method` as attributes: one treats `http` as a scalar value, while the other can require it to be an object path. Diagnose the actual document written by Data Prepper before changing templates or renaming every dotted field.

The relevant contract has three parts: the original attribute key, Data Prepper's output format, and the mapping of the concrete destination index.

## Capture the rejected document and exact index

Start with the failed OpenSearch bulk item or its dead-letter queue record. Save the document, target index, error type, and reason. A successful HTTP response for a bulk request does not imply that every item was indexed.

Then inspect the concrete index named in the failure:

```http
GET traces-production-000042/_mapping

GET traces-production-000042/_mapping/field/attributes.http*
```

Replace the example index with the actual destination. An alias or broad wildcard can hide that only one generation has the incompatible field. If a rejection names `attributes.http`, inspect both the parent and its children.

A mapping exception is different from exceeding the field-count limit. Both may follow an instrumentation rollout, but raising the field limit cannot resolve a scalar-object conflict.

## Check which representation Data Prepper produced

Current `otel_trace_source` supports `output_format: opensearch` and `output_format: otel`. The source's documented default is `opensearch`; do not assume another source, such as unified `otlp`, shares that default. See the [source reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/).

The OpenSearch-format codec transforms dots inside span attribute names to `@` and adds a prefix. An incoming `http.method` becomes a serialized field such as `span.attributes.http@method`. The standard OTel format retains dotted keys in an `attributes` map.

The [codec implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-proto-common/src/main/java/org/opensearch/dataprepper/plugins/otel/codec/OTelProtoOpensearchCodec.java) is the primary reference for the conversion. Inspect the implementation from your release when a generic JSON source, a custom processor, or a new source format is involved.

Do not add another dot-replacement transform until you know whether Data Prepper already applied one. Double normalization can create unexpected field names and break saved queries.

## Reproduce the conflict in an isolated index

The following deliberately creates a scalar field and then sends a document requiring the same path to be an object. Run it only in a disposable diagnostic index:

```http
PUT dp-attribute-conflict-probe
{
  "mappings": {
    "properties": {
      "attributes": {
        "properties": {
          "http": { "type": "keyword" }
        }
      }
    }
  }
}

POST dp-attribute-conflict-probe/_doc
{
  "attributes": {
    "http.method": "GET"
  }
}
```

Under the default dotted-field behavior, the second request conflicts with the scalar `attributes.http` mapping. OpenSearch describes dot expansion and the resulting conflicts in the [disable_objects documentation](https://docs.opensearch.org/latest/mappings/mapping-parameters/disable-objects/).

This fixture isolates the structural issue from Data Prepper. If it reproduces the same failure, compare its field path with the actual rejected span. If it does not, inspect whether your index uses different mapping behavior or whether the real failure is a value-type mismatch.

## Choose the smallest schema repair

If one application emits a custom scalar called `http`, rename that custom attribute at its producer or in a tested ingestion transform. Keep established semantic attributes and their types consistent across services.

If a pipeline changed from OpenSearch-format spans to OTel-format spans, use a separate correctly mapped destination and compatible sink type. The [OpenSearch sink reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/) associates OTel-format trace source output with `trace-analytics-plain-raw`. Merely retaining an old index name does not make its template compatible with the new document shape.

Some current OpenSearch releases support `disable_objects` for literal dotted-field behavior. Verify availability in your exact release and evaluate query and mapping consequences before adopting it. It is an index-creation decision, not an in-place repair for existing incompatible mappings.

Also check normalization collisions. Attribute keys `a.b` and `a@b` become indistinguishable under a naive dot-to-`@` transformation. Define a naming policy before blindly applying that replacement to arbitrary user attributes.

## Fix future indexes and handle existing data separately

OpenSearch cannot change an existing populated field from a scalar to an object or another incompatible type. Create a new index with the intended mappings, transform documents if needed, and plan any reindex or alias transition. The [mapping API documentation](https://docs.opensearch.org/latest/api-reference/index-apis/put-mapping/) explains this restriction.

Updating a template only affects subsequent index creation. Verify the mapping on the newly created destination before moving the writer. Keep the failed records available until replay succeeds.

Replay a representative fixture containing both conflicting attributes and ordinary spans. Check individual bulk results, DLQ growth, document counts, and the fields used by Dashboards. A repair that removes the indexing error but loses the route used for trace analysis is incomplete.

## Conclusion

Follow the attribute through decoding, serialization, and the concrete index mapping. Repair the producer or schema boundary that creates the conflict, then validate new writes and replay rejected records against the corrected mapping.
