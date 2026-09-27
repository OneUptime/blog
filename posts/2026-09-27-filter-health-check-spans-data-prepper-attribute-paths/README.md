# How to Filter Health-Check Spans with the Correct Data Prepper Attribute Paths

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Troubleshooting

Description: Filter Data Prepper health-check spans using the actual in-memory attribute schema and verify matching before dropping events.

---

A health-check filter can silently match nothing when it uses the field path visible in OpenSearch instead of the path visible to Data Prepper processors. Trace attributes can change names during decoding and flatten during serialization. Start by identifying the source's output format, then test the exact expression before enabling deletion.

This example targets `otel_trace_source` with `output_format: opensearch` and the traditional trace analytics span model. A pipeline using `output_format: otel` needs different attribute paths.

## Identify the attribute at each stage

For an OTLP span attribute named `http.route`, the OpenSearch-format decoder replaces the dot inside the attribute name with `@` and prefixes the key. The resulting in-memory attribute map contains a key such as `span.attributes.http@route`.

The upstream [OpenSearch codec](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/otel-proto-common/src/main/java/org/opensearch/dataprepper/plugins/otel/codec/OTelProtoOpensearchCodec.java) and [JacksonSpan serializer](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-api/src/main/java/org/opensearch/dataprepper/model/trace/JacksonSpan.java) explain the important distinction:

| Stage | Example representation |
|---|---|
| Original OTLP attribute key | `http.route` |
| Processor expression pointer | `"/attributes/span.attributes.http@route"` |
| Serialized OpenSearch-format field | `span.attributes.http@route` |

Within the pointer, `span.attributes.http@route` is one literal map key. It is not a sequence of nested keys separated by dots. The leading `/attributes/` traverses the in-memory attribute map.

A stdout sink may use the same flattened serialization, so its output alone is not proof of the pointer used by a preceding processor.

## Quote the pointer correctly

Data Prepper expressions use JSON pointers. For pointers containing dots or `@`, use the quoted form described in the [expression syntax reference](https://docs.opensearch.org/latest/data-prepper/pipelines/expression-syntax/).

Use a YAML single-quoted string around the expression so its internal double quotes remain intact:

```yaml
processor:
  - drop_events:
      drop_when: '"/attributes/span.attributes.http@route" == """/healthz"""'
      handle_failed_events: skip
```

The right-hand value uses three double quotes: `"""/healthz"""`. An ordinary quoted token starting with `/`, such as `"/healthz"`, is parsed as a JSON pointer rather than a literal path. The [Data Prepper 2.16.0 expression grammar](https://github.com/opensearch-project/data-prepper/blob/2.16.0/data-prepper-expression/src/main/antlr/DataPrepperExpression.g4) explicitly supports triple-quoted string literals for this distinction.

`handle_failed_events: skip` retains an event if expression evaluation fails and logs a warning. The documented default is to drop on evaluation failure, which is an undesirable surprise while developing a filter. See the [drop_events reference](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/drop-events/).

A valid expression that resolves a missing field can simply evaluate to false; it need not raise an exception. Therefore, watching only error logs will not reveal a path that never matches.

## Probe the value without dropping spans

Temporarily copy the candidate value into a clearly named diagnostic field in a staging pipeline:

```yaml
processor:
  - add_entries:
      entries:
        - key: health_route_probe
          value_expression: '"/attributes/span.attributes.http@route"'
sink:
  - stdout: {}
```

The [add_entries processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/add-entries/) supports expression-derived values. Send one known health-check span and one ordinary request. Confirm that the probe reports the expected route in each case before replacing it with `drop_events`.

Remove the probe after verification. Keep the fixture small and exclude sensitive attributes from any diagnostic output.

## Match the instrumented field, not an assumed convention

Your instrumentation may emit `http.route`, `url.path`, or an older `http.target`. Inspect which key is actually present. A route template such as `/orders/{id}` differs from a URL path, and a legacy target may contain query parameters.

For example, if the tested OpenSearch-format spans contain `http.route`, a scoped filter can be:

```yaml
processor:
  - drop_events:
      drop_when: >-
        /serviceName == "checkout" and
        (
          "/attributes/span.attributes.http@route" == """/healthz""" or
          "/attributes/span.attributes.http@route" == """/readyz"""
        )
      handle_failed_events: skip
```

This deliberately uses exact values and a known service. A substring expression matching every route containing “health” could remove legitimate application traffic.

If your source uses `output_format: otel`, the span attribute is instead represented under an ordinary `attributes` map with its dotted key, such as `"/attributes/http.route"`. The [trace source documentation](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sources/otel-trace-source/) documents the format selection. Verify the resulting shape for your installed release rather than combining paths from both formats in an untested filter.

## Decide where the filter belongs

Putting the filter before fan-out removes matching spans from both raw and service-map branches. Putting it only in the raw branch leaves service-map processing unaffected. Choose that behavior explicitly.

Dropping a root health-check span does not automatically drop all descendants in its trace. Descendants without the route attribute may survive, lose root-derived trace-group information, or contribute partial relationships. If the intended policy is to remove whole traces, implement and test a trace-level decision upstream with appropriate trace affinity.

Use a fixture containing a health-check root, an optional child, a normal request, a missing-route span, and a different service using the same route. Compare the retained span IDs to the intended policy, not merely a reduced record count.

## Conclusion

Verify the source format, probe the in-memory pointer, and use a narrowly scoped expression. Test the effect on child spans and both pipeline branches before enabling a health-check drop rule in production.
