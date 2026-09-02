# How to Design OpenSearch Index Templates for High-Cardinality Observability Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Index Templates, Observability, Performance, Index Management

Description: Separate mapping growth from value cardinality and use explicit, query-driven templates that keep observability ingestion and aggregations predictable.

---

“High cardinality” describes two different OpenSearch risks:

1. **Many field names**—for example arbitrary Kubernetes labels—cause mapping explosion.
2. **Many values in one field**—for example trace IDs—make terms/global-ordinal aggregations expensive.

An index template must address both. Raising `index.mapping.total_fields.limit` only postpones the first problem and does nothing for the second.

## Classify fields by how they are queried

Before writing mappings, inventory actual filters, full-text searches, aggregations, sorts, and retention needs:

| Field class | Examples | Mapping strategy |
| --- | --- | --- |
| Time | `@timestamp`, span start | `date` |
| Stable dimensions | service, environment, severity | `keyword`, aggregatable |
| Free text | log body, exception message | `text`; optional bounded keyword subfield |
| Exact high-cardinality IDs | trace, span, request ID | `keyword`; avoid aggregations, consider disabling doc values |
| Numeric measurements | duration, bytes, status code | appropriate numeric type |
| Unbounded attributes | user labels, arbitrary baggage | allow-list, non-dynamic object, or `flat_object` with limitations |

`doc_values: false` can reduce on-disk columnar storage for a keyword used only in exact term queries and never sorted, aggregated, or accessed through doc values in scripts. That is a query-contract decision; dashboards that later group on the field will fail.

## Create an explicit template

This log-oriented example keeps stable dimensions aggregatable, exact IDs searchable but not aggregatable, and unknown attributes in `_source` without dynamically mapping them:

```http
PUT _index_template/observability-logs-v1
{
  "index_patterns": ["logs-observability-*"],
  "priority": 300,
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1,
      "index.mapping.total_fields.limit": 1000
    },
    "mappings": {
      "dynamic": false,
      "properties": {
        "@timestamp": {"type": "date"},
        "message": {"type": "text"},
        "severity_text": {"type": "keyword", "ignore_above": 32},
        "service.name": {"type": "keyword", "ignore_above": 256},
        "deployment.environment.name": {"type": "keyword", "ignore_above": 128},
        "trace_id": {
          "type": "keyword",
          "ignore_above": 32,
          "doc_values": false
        },
        "span_id": {
          "type": "keyword",
          "ignore_above": 16,
          "doc_values": false
        },
        "user.id": {"type": "keyword", "ignore_above": 256},
        "duration_ms": {"type": "double"},
        "http.response.status_code": {"type": "integer"},
        "attributes": {
          "type": "object",
          "dynamic": false,
          "properties": {
            "region": {"type": "keyword"},
            "team": {"type": "keyword"}
          }
        }
      }
    }
  }
}
```

OpenSearch normally expands dotted names as object paths. OpenSearch 3.5+ also provides the `disable_objects` mapping parameter for literal flat dotted names; validate the resulting mapping with your current release.

`dynamic: false` preserves unknown fields in `_source` but does not index them. It protects the mapping while allowing gradual schema discovery. `dynamic: strict` rejects unknown fields and is appropriate only when rejection/DLQ handling is tested.

## Use `flat_object` deliberately

OpenSearch 2.7+ provides `flat_object` for objects with many or unknown keys. It avoids mapping every subfield and is useful when the object is mostly retrieved as context:

```json
"labels": {"type": "flat_object"}
```

It is not a transparent substitute for normal fields. Flat-object subfields are not indexed for fast lookup and do not provide type-specific parsing, numerical operations or numerical sorting, efficient subfield filtering, or subfield aggregations using dot notation. Promote the small allow-list used by dashboards into explicit keyword/numeric fields and keep the long tail flat.

## Control high-cardinality aggregations

Do not run overview `terms` aggregations on trace IDs, request IDs, raw URLs, pod UIDs, or user IDs. For distinct-count use cases, the cardinality aggregation uses HyperLogLog++ and offers a `precision_threshold` trade-off:

```http
GET logs-observability-*/_search
{
  "size": 0,
  "aggs": {
    "estimated_unique_users": {
      "cardinality": {
        "field": "user.id",
        "precision_threshold": 3000
      }
    }
  }
}
```

The result is approximate. Higher thresholds use more memory and the documented maximum is 40,000. If distinct count is a regular KPI, consider a pre-aggregated/rollup design rather than recomputing it over raw events on every refresh.

## Align shards and lifecycle with the template

Cardinality and shard count interact: every shard builds/returns its own aggregation state for the coordinating node to merge. Use rollover based on observed primary-shard size and age, not an arbitrary daily index with a fixed high shard count.

Keep templates signal-specific. Logs, raw spans, service maps, and metric documents have different schemas and processors; one `observability-*` template creates broad patterns and accidental conflicts.

## Test before creating production indexes

Templates apply to newly created indexes; they do not retrofit old mappings. Before rollout:

```http
GET _index_template/observability-logs-v1
POST _index_template/_simulate_index/logs-observability-canary
PUT logs-observability-canary
GET logs-observability-canary/_mapping
```

Index fixtures containing missing fields, long values, arbitrary labels, mixed numeric types, and malformed timestamps. Run `_field_caps` over the old and canary patterns. If a field type changes, write to a new index generation and reindex only after a conversion plan; an existing field's type cannot be changed in place.

## Monitor the schema

Track mapped field count, mapping update rate, rejected bulk items, fielddata/global-ordinal memory, shard count/size, and slow aggregation queries. A field limit is an alarm boundary, not the normal operating target.

## Official References

- [OpenSearch index templates](https://docs.opensearch.org/latest/im-plugin/index-templates/)
- [OpenSearch mapping explosion](https://docs.opensearch.org/latest/mappings/mapping-explosion/)
- [OpenSearch flat object field type](https://docs.opensearch.org/latest/field-types/flat-object/)
- [OpenSearch cardinality aggregation](https://docs.opensearch.org/latest/aggregations/metric/cardinality/)
- [OpenSearch field data cache](https://docs.opensearch.org/latest/search-plugins/caching/field-data-cache/)
