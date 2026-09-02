# Validation Summary: How to Design OpenSearch Index Templates for High-Cardinality Observability Data

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenSearch composable index templates
- OpenSearch explicit and dynamic mappings
- `keyword`, `text`, numeric, object, and `flat_object` field types
- Doc values, field data, and global ordinals
- Terms and cardinality aggregations with HyperLogLog++
- Index State Management rollover and shard sizing
- Index-template simulation, mapping, field-capabilities, and reindex workflows

## Sources Consulted

- [OpenSearch index templates](https://docs.opensearch.org/latest/im-plugin/index-templates/)
- [Simulate Index Templates API](https://docs.opensearch.org/latest/api-reference/index-apis/simulate-index-template/)
- [OpenSearch mapping explosion](https://docs.opensearch.org/latest/mappings/mapping-explosion/)
- [Dynamic mapping parameter](https://docs.opensearch.org/latest/mappings/mapping-parameters/dynamic/)
- [Object field type](https://docs.opensearch.org/latest/mappings/supported-field-types/object/)
- [Keyword field type](https://docs.opensearch.org/latest/mappings/supported-field-types/keyword/)
- [Doc values mapping parameter](https://docs.opensearch.org/latest/mappings/mapping-parameters/doc-values/)
- [Ignore above mapping parameter](https://docs.opensearch.org/latest/mappings/mapping-parameters/ignore-above/)
- [Disable objects mapping parameter](https://docs.opensearch.org/latest/mappings/mapping-parameters/disable-objects/)
- [OpenSearch 3.5.0 release notes](https://github.com/opensearch-project/OpenSearch/releases/tag/3.5.0)
- [OpenSearch 3.6.0 release notes](https://github.com/opensearch-project/OpenSearch/releases/tag/3.6.0)
- [Flat object field type](https://docs.opensearch.org/latest/mappings/supported-field-types/flat-object/)
- [Terms aggregation](https://docs.opensearch.org/latest/aggregations/bucket/terms/)
- [Cardinality aggregation](https://docs.opensearch.org/latest/aggregations/metric/cardinality/)
- [Eager global ordinals mapping parameter](https://docs.opensearch.org/latest/mappings/mapping-parameters/eager_global_ordinals/)
- [Field data cache](https://docs.opensearch.org/latest/search-plugins/caching/field-data-cache/)
- [Index rollups](https://docs.opensearch.org/latest/im-plugin/index-rollups/index/)
- [Index State Management policies and rollover conditions](https://docs.opensearch.org/latest/im-plugin/ism/policies/)
- [Search shard routing](https://docs.opensearch.org/latest/search-plugins/searching-data/search-shard-routing/)
- [Field capabilities API](https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/)
- [Update Mapping API](https://docs.opensearch.org/latest/api-reference/index-apis/put-mapping/)

## Issues Found

- The post described disabling doc values as directly saving both columnar storage and heap pressure. OpenSearch documents doc values as an on-disk, column-oriented structure, so the direct saving is disk usage; heap savings from preventing aggregation/global-ordinal work are indirect. Updated the sentence to state the direct storage effect and to include doc-value-backed script access in the query contract.
- The post called `disable_objects` newer behavior without identifying its compatibility boundary. Updated the sentence to state that this mapping parameter is available in OpenSearch 3.5+ and that it preserves dotted names as literal flat field identifiers.
- The `flat_object` limitation sentence could be read as ruling out all sorting and aggregations. OpenSearch specifically documents the absence of numerical sorting and subfield aggregations using dot notation, while flat-object subfields are not indexed for fast lookup. Narrowed the wording to those documented limitations.

## Review Notes

- The composable index-template body and every REST command are syntactically current. The simulation endpoint correctly resolves all templates that match the canary index name.
- `dynamic: false`, dotted-name expansion, `index.mapping.total_fields.limit`, `ignore_above`, and the searchability of keyword fields with doc values disabled all behave as described.
- `flat_object` was introduced in OpenSearch 2.7. Its mapping example and the stated limitations around typed operations, efficient subfield filtering, numerical sorting, and subfield aggregations are accurate.
- The cardinality example is valid: the aggregation is approximate, uses HyperLogLog++, and supports `precision_threshold` values up to 40,000.
- Native index-rollup support for the cardinality metric was introduced in OpenSearch 3.5. The post's broader recommendation for a pre-aggregated or rollup design remains correct; deployments using the built-in rollup metric need OpenSearch 3.5+.
- OpenSearch 3.6 fixed an `_field_caps` defect affecting `disable_objects` mappings in 3.5. The shown template does not enable `disable_objects`, but users adopting that optional behavior should use a release containing the fix.
