# How to Quote Timestamp and Dotted OpenTelemetry Fields in OpenSearch PPL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Logging

Description: Use backticks for timestamp and dotted OpenTelemetry field identifiers in OpenSearch PPL, and distinguish identifier errors from mapping problems.

OpenTelemetry logs often expose fields such as `resource.attributes.service.name`, while other log pipelines use `@timestamp`. These names are convenient in JSON but can be confusing in a query language that also uses punctuation and quoted strings.

In OpenSearch PPL, use backticks for delimited identifiers and single quotes for string values. Then confirm that the identifier names a field your index actually exposes. Quoting resolves syntax; it does not create a field or change its mapping.

## Quote the complete field name

Consider an index with an OpenTelemetry service field, a timestamp, and a body:

```text
source=`logs-prod-2026.09.27`
| where `resource.attributes.service.name` = 'checkout'
| fields `@timestamp`, `resource.attributes.service.name`, body
| head 20
```

There are three distinct pieces of syntax:

| Expression | Meaning |
| --- | --- |
| `` `@timestamp` `` | Field identifier containing a special character |
| `` `resource.attributes.service.name` `` | Delimited field identifier containing dots |
| `'checkout'` | String value compared with the field |

The [identifier reference](https://docs.opensearch.org/latest/sql-and-ppl/identifiers/) documents backticks for special characters, reserved words, and dotted names. It also states that identifiers are case-sensitive. `severityText` and `severitytext` should not be treated as interchangeable names.

Quote the index expression as well when it contains punctuation. The example uses an explicit daily index to remove wildcard ambiguity while debugging. After the query works, replace it with the correct alias or index pattern.

## Verify the actual schema

OpenTelemetry is a telemetry model, not a guarantee that every exporter writes identical OpenSearch field names. Inspect a stored document and its mapping:

```http
GET logs-prod-2026.09.27/_search
{
  "size": 1,
  "_source": ["@timestamp", "time", "resource", "service", "serviceName", "body"]
}

GET logs-prod-2026.09.27/_mapping
```

A pipeline might write the event time as `time`, the service as `serviceName`, or a different nested object layout. Use those actual mapped paths. Do not substitute a name from an unrelated screenshot simply because both systems ingest OTLP.

When querying multiple indexes, inspect field capabilities:

```http
POST logs-prod-*/_field_caps?fields=@timestamp,time,resource.attributes.service.name,serviceName
```

The [Field Capabilities API](https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/) reports field types and search/aggregation capabilities across the selected indexes. A type conflict across daily indexes is a mapping problem; adding more backticks cannot repair it.

## Use a short alias for subsequent calculations

Long identifiers make a query difficult to audit when repeated. Create a distinct alias after confirming the field:

```text
source=`logs-prod-2026.09.27`
| eval service = `resource.attributes.service.name`
| where service = 'checkout'
| stats count() as log_count by service
| sort - log_count
```

Choose an alias that does not overwrite an existing field whose value you still need. Keep the full source name visible in the `eval` assignment so the query explains where the value came from.

A common mistake is assigning a quoted string instead:

```text
| eval service = 'resource.attributes.service.name'
```

That assigns the same literal text to each row. If every service becomes one suspiciously identical group, inspect quoting before investigating ingestion. The [eval reference](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/eval/) describes expression-based field creation.

## Preserve quoting inside API requests

Backticks do not require special escaping inside a JSON string. This request can be sent from OpenSearch Dashboards Dev Tools:

```http
POST /_plugins/_ppl
{
  "query": "source=`logs-prod-2026.09.27` | where `resource.attributes.service.name` = 'checkout' | fields `@timestamp`, body | head 20"
}
```

Shells are a separate concern: backticks can perform command substitution in shell command text. When calling the API from a script, put the JSON request in a file or use a quoted heredoc and a JSON serializer. Do not paste a query containing backticks into an unprotected shell string.

## Separate syntax from data modeling

A dotted field can resolve to an ordinary object property, but arrays mapped as `nested` need the appropriate nested-query semantics to preserve relationships between their elements. Backticks do not make a flattened object array relational.

Likewise, a quoted `@timestamp` still needs a date-compatible mapping for time operations. PPL exposes OpenSearch `date` and `date_nanos` fields as timestamps, as described in the [data types reference](https://docs.opensearch.org/latest/sql-and-ppl/datatypes/).

During diagnosis, simplify to `source`, `fields`, and a small `head`. Add the value filter next, then time conditions and aggregations. This isolates whether the failure occurs during name resolution, comparison, or later processing.

## Conclusion

Use backticks around the complete timestamp or dotted field identifier, and use string quotes for values. Confirm mappings and exact capitalization before adding more complex query stages; correct quoting is the first step toward a correct query, not a replacement for schema inspection.
