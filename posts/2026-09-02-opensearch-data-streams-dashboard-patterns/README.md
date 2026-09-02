# How to Use OpenSearch Data Streams for Time-Series Logs Without Breaking Dashboard Index Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Data Streams, Logging, Index Management, Observability

Description: Put append-only logs behind a stable OpenSearch data stream and point dashboards at its logical name so rollover never exposes backing-index generations.

---

An OpenSearch data stream is a stable logical name over hidden, generated backing indexes. Writes go to the newest backing index and searches span all generations. Dashboards remain stable when their index pattern targets the data stream name-not a concrete `.ds-*` backing index.

Data streams fit append-only logs, metrics, and events. They require a timestamp field and are a poor fit when the normal workflow updates or deletes arbitrary historical documents by ID.

## Create the template first

The index template must match the future stream name and include an empty `data_stream` object:

```http
PUT _index_template/application-logs-stream
{
  "index_patterns": ["logs-app-*"],
  "priority": 200,
  "data_stream": {},
  "template": {
    "settings": {
      "number_of_shards": 2,
      "number_of_replicas": 1
    },
    "mappings": {
      "properties": {
        "@timestamp": {"type": "date"},
        "message": {"type": "text"},
        "service.name": {"type": "keyword"},
        "log.level": {"type": "keyword"},
        "trace_id": {"type": "keyword"}
      }
    }
  }
}
```

Before creating the stream, inspect overlapping templates. When multiple templates match, the highest priority wins; an unintended higher-priority template can silently change mappings or settings.

```http
GET _index_template
POST _index_template/_simulate_index/logs-app-prod
```

## Create and write to the stream

```http
PUT _data_stream/logs-app-prod

POST logs-app-prod/_doc
{
  "@timestamp": "2026-09-02T10:15:00Z",
  "service.name": "checkout",
  "log.level": "INFO",
  "message": "request completed"
}
```

The first write can also create a stream automatically when a matching data-stream template exists and auto-creation is allowed, but explicit creation makes deployment failures visible earlier.

Verify the logical and physical layers:

```http
GET _data_stream/logs-app-prod
GET _resolve/index/logs-app-prod
GET _cat/indices/.ds-logs-app-prod-*?v&expand_wildcards=open,hidden
```

Applications should write to `logs-app-prod`. Do not write to the backing index shown by `_data_stream`.

## Point Dashboards at the logical name

In **Dashboards Management > Index patterns**, create an index pattern using one of these expressions:

- `logs-app-prod` for one environment;
- `logs-app-*` for a controlled group of streams.

Select `@timestamp` as the time field. OpenSearch index patterns can refer to indexes, aliases, or data streams, and visualizations work with a data stream the same way they work with an ordinary index.

Avoid targeting a concrete backing index such as `.ds-logs-app-prod-000001`; it will omit future generations after rollover. A wildcard such as `.ds-logs-app-prod-*` can match later hidden generations, but it still relies on implementation-detail names and hidden-index handling, so prefer the logical stream name.

Also avoid a very broad pattern such as `logs-*` if it combines incompatible mappings. Use `_field_caps` to verify fields across every matched stream:

```http
POST logs-app-*/_field_caps?fields=@timestamp,service.name,log.level
```

## Roll over without changing dashboards

Test a manual rollover:

```http
POST logs-app-prod/_rollover?dry_run=true
{
  "conditions": {
    "max_age": "1d",
    "max_size": "30gb"
  }
}
```

Remove `dry_run=true` only when the result is expected. The stream name remains unchanged while OpenSearch creates the next backing generation.

For automation, attach an Index State Management policy. On data streams, ISM applies a policy to backing indexes at creation time and infers the rollover alias, so do not add the regular-index `rollover_alias` setting. When attaching a policy to an existing data stream, the policy affects future backing indexes; inspect existing generations separately.

## Migration cautions

You cannot create a data stream with the same name as an existing index or alias. A safe migration is:

1. Create the template and a new stream name.
2. Switch the shipper to write to the stream.
3. Validate new documents and dashboard mappings.
4. Reindex historical data with the destination `op_type` set to `create`, and only after ensuring every document has a valid timestamp.
5. Update the index pattern to a stable expression that covers the intended old and new data, or cut over to the stream alone.

Do not delete old indexes merely to free the name. Snapshot and retention requirements still apply.

## Troubleshooting

- **`illegal_argument_exception` on creation:** inspect conflicting index/alias names and matching templates.
- **Document rejected for timestamp:** ensure the configured timestamp field exists and parses as a date.
- **Dashboard stops at rollover:** replace a concrete backing-index target with the stream's logical name.
- **Fields change after rollover:** fix the template; updating an old backing index does not guarantee future generations inherit the correction.
- **ISM appears inactive:** use the ISM Explain API and remember policies run on a schedule, not continuously.

## Official References

- [OpenSearch data streams](https://docs.opensearch.org/latest/im-plugin/data-streams/)
- [OpenSearch index patterns](https://docs.opensearch.org/latest/dashboards/management/index-patterns/)
- [OpenSearch index templates](https://docs.opensearch.org/latest/im-plugin/index-templates/)
- [OpenSearch ISM policies](https://docs.opensearch.org/latest/im-plugin/ism/policies/)
