# Validation Summary: Use OpenSearch Data Streams Without Breaking Dashboards

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenSearch data streams and backing indexes
- OpenSearch composable index templates and template simulation
- OpenSearch Dashboards index patterns
- OpenSearch Resolve Index, CAT Indices, and Field Capabilities APIs
- OpenSearch Roll Over Index API
- OpenSearch Index State Management (ISM)
- OpenSearch Reindex API

## Sources Consulted
- [OpenSearch data streams](https://docs.opensearch.org/latest/im-plugin/data-streams/)
- [OpenSearch index templates](https://docs.opensearch.org/latest/im-plugin/index-templates/)
- [OpenSearch Simulate Index Templates API](https://docs.opensearch.org/latest/api-reference/index-apis/simulate-index-template/)
- [OpenSearch Resolve Index API](https://docs.opensearch.org/latest/api-reference/index-apis/resolve-index/)
- [OpenSearch CAT Indices API](https://docs.opensearch.org/latest/api-reference/cat/cat-indices/)
- [OpenSearch Dashboards index patterns](https://docs.opensearch.org/latest/dashboards/management/index-patterns/)
- [OpenSearch Field Capabilities API](https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/)
- [OpenSearch Roll Over Index API](https://docs.opensearch.org/latest/api-reference/index-apis/rollover/)
- [OpenSearch ISM policies](https://docs.opensearch.org/latest/im-plugin/ism/policies/)
- [OpenSearch ISM API](https://docs.opensearch.org/latest/im-plugin/ism/api/)
- [OpenSearch Reindex Documents API](https://docs.opensearch.org/latest/api-reference/document-apis/reindex/)
- [OpenSearch 3.8 rollover request parser](https://github.com/opensearch-project/OpenSearch/blob/3.8/server/src/main/java/org/opensearch/action/admin/indices/rollover/RolloverRequest.java)
- [OpenSearch 3.8 rollover REST handler](https://github.com/opensearch-project/OpenSearch/blob/3.8/server/src/main/java/org/opensearch/rest/action/admin/indices/RestRolloverIndexAction.java)

## Issues Found
1. **Incomplete hidden-index expansion in the CAT Indices request:** `expand_wildcards=hidden` does not select open hidden backing indexes by itself. Changed it to `expand_wildcards=open,hidden`, as required by the CAT Indices API.
2. **Unsupported manual rollover condition:** The core Roll Over Index API does not accept `max_primary_shard_size`. Replaced it with the supported `max_size` condition. `max_size` measures the combined storage size of all primary shards and excludes replicas.
3. **Overstated rollover failure for a backing-index wildcard:** `.ds-logs-app-prod-*` can match later generations when hidden indexes are included, so it is not necessarily tied to one generation. Reworded the warning to distinguish a concrete backing index, which does omit future generations, from a hidden backing-index wildcard, which is still brittle because it relies on implementation-detail names and hidden-index handling.
4. **Missing data-stream reindex requirement:** Reindexing into a data stream requires the destination `op_type` to be `create`. Added that requirement to the migration step while retaining the timestamp validation requirement.
5. **Misleading version caveat for template simulation:** Removed the claim that the `_simulate_index` endpoint is version-dependent. The endpoint and data streams were both available starting with OpenSearch 1.0, so every OpenSearch release that supports this guide's data-stream workflow also supports the shown simulation operation.

## Review Notes
- The similarly named `min_primary_shard_size` condition belongs to an ISM rollover action; it is not a condition accepted by the manual `_rollover` API.
- The `dry_run=true` rollover query parameter is supported by OpenSearch's REST handler even though the current Roll Over Index API documentation does not list it in the query-parameter table.
- Data-stream template creation, automatic stream creation on a qualifying document write, logical-name searches, ISM policy behavior, and the dashboard index-pattern guidance were otherwise verified as correct.
