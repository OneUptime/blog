# How to Validate Service-Map Index Selection for Separate OpenSearch Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, OpenTelemetry, Observability

Description: Verify that separate OpenSearch applications write and query the intended service-map indexes with compatible mappings and isolated fixtures.

---

Two applications can have separate raw-span indexes while their service maps still come from a shared default index. That can produce unrelated services in one view or an empty map despite visible traces. Validate both ends of the service-map path: where Data Prepper writes relationship documents and where Dashboards reads them.

This guide focuses on the traditional `service_map` processor and its `trace-analytics-service-map` sink type. Newer `otel_apm_service_map` pipelines use a different, time-based model and must be checked against their own schema and index configuration.

## Inventory the four destinations

For each application, record the intended raw-span destination and service-map destination, then compare them with the UI selections:

| Application | Span destination | Service-map destination |
|---|---|---|
| Payments | `payments-spans-*` | `payments-service-map` |
| Catalog | `catalog-spans-*` | `catalog-service-map` |

These are example names. Establish whether each is a concrete index, alias, or wildcard before using it in a query.

Record the Data Prepper, OpenSearch, and Dashboards versions too. Expanded custom span, service, and log index support was introduced in OpenSearch Dashboards 3.1. Earlier versions may not provide the same settings. The [Trace Analytics documentation](https://docs.opensearch.org/latest/observing-your-data/trace/ta-dashboards/) also requires compatible Data Prepper mappings for custom span indexes.

## Do not infer the target from a YAML index line

A tempting configuration is:

```yaml
# Do not assume this overrides the built-in destination.
index_type: trace-analytics-service-map
index: payments-service-map
```

The sink's built-in index types can select their own default aliases and templates. In the referenced upstream [IndexConfiguration implementation](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/index/IndexConfiguration.java), a built-in type's alias takes precedence over the supplied index alias. [IndexConstants](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/index/IndexConstants.java) maps the traditional service-map type to `otel-v1-apm-service-map`.

Verify that behavior against your deployed tag and inspect actual writes. A pipeline starting successfully does not mean the supplied custom name became its target.

```http
GET _cat/indices/*service-map*?v

GET _cat/aliases/*service-map*?v

GET otel-v1-apm-service-map*/_search
{
  "size": 5,
  "query": { "match_all": {} }
}
```

Use narrowly scoped patterns on large clusters and run the checks with permissions equivalent to the intended reader where appropriate.

## Preserve the schema when using a custom destination

If a separate index is required, choose a supported custom-index configuration and provision the matching service-map mappings first. With a precreated index, the relevant sink fragment can be:

```yaml
index_type: custom
index: payments-service-map
document_id: "${/hashId}"
```

This is a fragment for the service-map branch's existing OpenSearch sink, not a complete sink. Keep its hosts, TLS, authentication, retry, and DLQ settings.

The traditional built-in sink derives document identity from `hashId`; preserve the corresponding behavior when switching to a custom sink. Otherwise repeated relationship output can create duplicate documents. Use the complete [service-map template from the matching Data Prepper release](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/opensearch/src/main/resources/otel-v1-apm-service-map-index-template.json) as the schema reference, including keyword fields used for aggregation.

Do not point this sink at a span index or apply a span template simply because both documents originate from traces.

## Prove that application routing is isolated

Create two small fixtures with distinct service names and trace IDs:

```text
payments-probe-api -> payments-probe-worker
catalog-probe-api  -> catalog-probe-worker
```

Feed each through its intended ingestion path. Ensure the service-map branch receives the spans needed to construct each relationship; filtering out one side before the processor can make the test inconclusive.

After the configured processing window, inspect each service-map destination directly:

```http
GET payments-service-map/_search
{
  "size": 0,
  "aggs": {
    "services": {
      "terms": {
        "field": "serviceName",
        "size": 20
      }
    }
  }
}
```

This query assumes the traditional template's keyword `serviceName` field. Check the mapping before adapting it to a different service-map generation.

Inspect relationship documents as well as service names. The payments destination should contain its test relationship and exclude the catalog fixture. Distinct destination names do not isolate data if both pipelines consume the same unfiltered stream.

## Validate the reader independently

In the supported Observability settings for the installed Dashboards version, select the intended span and service indexes. Confirm the selected data source or cluster, workspace or tenant context, and reader permissions. Inspect the actual request made by the service-map view to establish which index pattern it used.

Use the same user for the UI and permission checks. An administrator seeing the documents in Dev Tools does not establish that the application's viewer can read them.

If the index selection is correct but the map is incomplete, investigate processor output, relationship fields, and rendering limits. The traditional [service_map documentation](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/service-map/) describes a static map; it does not provide the same historical topology behavior as the newer time-based processor.

## Conclusion

Validate the concrete write target, its schema, its application-specific records, and the UI's actual read target. Separate span indexes alone do not establish separate service maps or access isolation.
