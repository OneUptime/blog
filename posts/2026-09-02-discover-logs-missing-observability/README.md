# Fix OpenSearch Logs Missing from Observability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Logging, Troubleshooting

Description: Diagnose why indexed logs appear in classic Discover but not the observability log explorer by repairing workspace, dataset, time-field, and schema configuration.

---

Seeing documents in classic Discover proves that an index pattern can search the data. It does not prove that the newer observability experience knows which data source, dataset, time field, and correlation fields to use.

In OpenSearch Dashboards 3.5 and later, **Discover > Logs** is an observability-workspace feature backed by a logs dataset. Classic Discover is backed by an index pattern. Treat those as two separate configuration layers.

## Confirm that the documents and mappings are healthy

Start at the storage layer instead of repeatedly recreating UI objects:

```http
GET _resolve/index/logs-*

GET logs-*/_search
{
  "size": 1,
  "sort": [{"@timestamp": "desc"}],
  "_source": [
    "@timestamp",
    "message",
    "trace_id",
    "span_id",
    "service.name"
  ]
}

POST logs-*/_field_caps?fields=@timestamp,time,traceId,trace_id,trace.id,spanId,span_id,span.id,service.name,resource.attributes.service.name
```

Look for four failure classes:

- The wildcard resolves to the wrong index, alias, or data stream.
- The newest document is outside the UI time picker.
- The selected time field is not mapped as `date` or `date_nanos`.
- One wildcard covers indexes in which the same field has incompatible types.

OpenSearch cannot change the type of an existing field in place, and mapping updates do not reprocess already indexed documents. If `@timestamp` was indexed as `text`, create a correctly mapped destination and reindex the existing documents. Also fix the index template or upstream pipeline, and write future documents to a new correctly mapped index, before expecting time filtering to work.

## Enable the observability workspace features

The complete dataset and trace-correlation workflow described here uses these settings in `opensearch_dashboards.yml`:

```yaml
workspace.enabled: true
data_source.enabled: true
explore.enabled: true
explore.discoverTraces.enabled: true
datasetManagement.enabled: true
```

Restart OpenSearch Dashboards after changing the file. Workspaces and Security plugin multi-tenancy are not compatible in this workflow; the official docs require disabling multi-tenancy before enabling workspaces:

```yaml
opensearch_security.multitenancy.enabled: false
```

Do not make that change casually on a shared deployment. Plan how existing tenant-owned saved objects will be migrated and test the change outside production.

## Associate the correct data source

Create or open an **Observability** workspace. If `logs-*` is on a connected OpenSearch data source, verify that the connection is associated with the workspace. A connection visible elsewhere in Dashboards is not necessarily attached to the current workspace. If the data is on the OpenSearch cluster configured directly for Dashboards, select **Local cluster** when creating the dataset; no saved data-source connection needs to be associated.

This is especially easy to miss with multiple data sources: identical index names can exist in two clusters. Compare a known document ID, or resolve the concrete index and then compare its UUID with `GET logs-*/_settings/index.uuid?flat_settings=true`, rather than relying only on the display name.

## Create a logs dataset

Within the workspace, open **Datasets**, create a **Logs** dataset, and configure:

- Data source: the cluster verified above.
- Index expression: the narrowest stable pattern, such as `logs-prod-*`.
- Time field: the mapped event timestamp, normally `@timestamp`.
- Name and description: identify environment and service scope.

The dataset-not the classic index pattern-is what appears in the Discover Logs dataset selector. After saving it, open **Discover > Logs**, select the dataset, widen the time range, and run an unfiltered query before adding PPL clauses.

## Map fields for correlation

Field mappings are optional for basic log browsing but required for useful trace-to-log correlation. At minimum, map the Trace ID. In the dataset's schema mappings, point the standard concepts at the actual source fields:

| Dataset concept | Common OTel field | Common ECS-style field |
| --- | --- | --- |
| Trace ID | `traceId` or `trace_id` | `trace.id` |
| Span ID | `spanId` or `span_id` | `span.id` |
| Service name | `resource.attributes.service.name` | `service.name` |
| Timestamp | `time` or `@timestamp` | `@timestamp` |

Schema mappings alone do not link the datasets. Open the trace dataset, select **Correlated datasets > Configure correlation**, select this logs dataset, and save.

Use the names returned by `_field_caps`; do not assume a naming convention. A trace ID should be consistently represented, normally as an exact-value field, rather than analyzed full text.

## A compact decision tree

```text
No documents through REST?       Fix ingestion/index selection.
REST works, classic Discover?    Confirm time picker and index pattern.
Not in Discover > Logs?          Select Local cluster or attach the connection; create dataset.
Logs work, correlation fails?    Verify dataset correlation, schema mappings, and ID values.
Only some indexes fail?          Find field-type conflicts in wildcard.
```

OpenSearch documents the dataset-based Discover interfaces as introduced in OpenSearch Dashboards 3.5. On earlier Dashboards versions, use the documentation matching your installed version and, where this interface is unavailable, use the classic Observability/Trace Analytics workflow.

## Official References

- [OpenSearch datasets](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/datasets/)
- [Analyzing logs in Discover](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/discover-logs/)
- [Using Discover for observability](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/)
- [OpenSearch correlations](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/correlations/)
- [OpenSearch Field Capabilities API](https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/)
