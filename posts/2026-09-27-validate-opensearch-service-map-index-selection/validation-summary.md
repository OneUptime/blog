# Validation Summary: How to Validate Service-Map Index Selection for Separate OpenSearch Applications

## Status
validated

## Post Type
Technical validation and troubleshooting guide.

## Technologies Covered
- OpenSearch indexes, aliases, mappings, CAT APIs, search, and terms aggregations.
- OpenSearch Dashboards Trace Analytics and Observability settings.
- OpenSearch Data Prepper service-map processors and OpenSearch sink configuration.
- OpenTelemetry traces and service relationships.
- YAML configuration and JSON request bodies.

## Sources Consulted
- [Trace Analytics in OpenSearch Dashboards](https://docs.opensearch.org/latest/observing-your-data/trace/ta-dashboards/) — custom span, service, and log index support introduced in 3.1; required span mappings; rendering limits.
- [Service map processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/service-map/) — traditional static topology and processing windows.
- [OTel APM service map processor](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/processors/otel-apm-service-map/) — newer time-based topology model.
- [OpenSearch sink](https://docs.opensearch.org/latest/data-prepper/pipelines/configuration/sinks/opensearch/) — supported index types, custom destinations, template configuration, document ID expressions, and default indexing action.
- [IndexConfiguration.java at the post's pinned commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/index/IndexConfiguration.java) — built-in alias precedence and hashId-derived document identity; retrieved through raw.githubusercontent.com.
- [IndexConstants.java at the post's pinned commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/opensearch/src/main/java/org/opensearch/dataprepper/plugins/sink/opensearch/index/IndexConstants.java) — traditional service-map default destination; retrieved through raw.githubusercontent.com.
- [Traditional service-map template at the post's pinned commit](https://github.com/opensearch-project/data-prepper/blob/0c8acd7ffc0328b1f9dbd9bc7161ed673a59be42/data-prepper-plugins/opensearch/src/main/resources/otel-v1-apm-service-map-index-template.json) — keyword serviceName and relationship-field mappings; retrieved through raw.githubusercontent.com.
- [CAT Indices API](https://docs.opensearch.org/latest/api-reference/cat/cat-indices/) — endpoint, wildcard handling, verbose output, and permissions.
- [CAT Aliases API](https://docs.opensearch.org/latest/api-reference/cat/cat-aliases/) — alias lookup, verbose output, and permissions.
- [Search API](https://docs.opensearch.org/latest/api-reference/search-apis/search/) — indexed GET searches, wildcard targets, size, and aggregations.
- [Match all queries](https://docs.opensearch.org/latest/query-dsl/match-all/) — match_all request syntax.
- [Terms aggregation](https://docs.opensearch.org/latest/aggregations/bucket/terms/) — keyword fields and bucket size behavior.

## Issues Found
No technical issues found.

## Review Notes
- README.md was left unchanged. The pinned implementation confirms that the built-in service-map type overrides the supplied index name and derives document IDs from hashId. The custom fragment uses the documented document_id expression syntax and assumes an already provisioned compatible index.
- The 3.1 custom-index support claim agrees with the official documentation. The post appropriately asks readers to verify deployed versions rather than treating the pinned implementation as universal across releases.
- The HTTP examples are Dashboards Dev Tools requests, not standalone shell commands. Both JSON request bodies were parsed successfully; YAML configuration keys and values were checked against the sink documentation.
- The terms aggregation returns at most 20 service buckets. It is a useful inspection query, but absence from those buckets alone cannot prove fixture exclusion on a populated index. The post also requires inspection of relationship documents; targeted fixture queries would make a future automated check stronger.
- Processing windows, sink buffering, and index refresh can affect when fixture documents become searchable. No fixed end-to-end visibility guarantee is asserted.
- CAT permissions differ from search permissions. The advice to verify actual reads with the intended UI user is appropriate; separate index names alone do not enforce access restrictions.
- All technical reference targets were checked through official documentation or the corresponding pinned raw source. No live OpenSearch cluster, Data Prepper pipeline, or Dashboards session was provided, so this was documentation and source validation rather than an end-to-end runtime test.
