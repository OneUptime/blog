# Validation Summary: Migrate OpenSearch Dashboards and Saved Objects

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- OpenSearch
- OpenSearch Dashboards saved objects
- OpenSearch Dashboards multiple data sources
- OpenSearch Dashboards tenants and workspaces
- Index patterns, aliases, and data streams
- OpenSearch Dashboards 3.5+ datasets and trace-to-logs correlations
- NDJSON, `jq`, and GNU Coreutils checksum/counting commands

## Sources Consulted

- [OpenSearch Dashboards management](https://docs.opensearch.org/latest/dashboards/management/management-index/)
- [OpenSearch multiple data sources and saved-object import](https://docs.opensearch.org/latest/dashboards/management/multi-data-sources/)
- [OpenSearch Dashboards Saved Objects API](https://opensearch-project.github.io/OpenSearch-Dashboards/docs/openapi/saved_objects/)
- [OpenSearch Dashboards saved-object migration documentation](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/main/src/core/server/saved_objects/migrations/README.md#import--export)
- [OpenSearch Resolve Index API](https://docs.opensearch.org/latest/api-reference/index-apis/resolve-index/)
- [OpenSearch Field Capabilities API](https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/)
- [OpenSearch index patterns](https://docs.opensearch.org/latest/dashboards/management/index-patterns/)
- [OpenSearch Dashboards multi-tenancy](https://docs.opensearch.org/latest/security/multi-tenancy/tenant-index/)
- [OpenSearch multi-tenancy configuration](https://docs.opensearch.org/latest/security/multi-tenancy/multi-tenancy-config/)
- [OpenSearch Dashboards workspaces](https://docs.opensearch.org/latest/dashboards/workspace/workspace/)
- [OpenSearch workspace access control lists](https://docs.opensearch.org/latest/dashboards/workspace/workspace-acl/)
- [OpenSearch 3.5 datasets](https://docs.opensearch.org/3.5/observing-your-data/exploring-observability-data/datasets/)
- [OpenSearch 3.5 correlations](https://docs.opensearch.org/3.5/observing-your-data/exploring-observability-data/correlations/)
- [OpenSearch Dashboards 3.5 index-pattern saved-object implementation](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/3.5.0/src/plugins/data/common/index_patterns/index_patterns/index_pattern.ts)
- [OpenSearch Dashboards 3.5 correlation saved-object registration](https://github.com/opensearch-project/OpenSearch-Dashboards/blob/3.5.0/src/plugins/data/server/saved_objects/correlations.ts)
- [OpenSearch system indexes](https://docs.opensearch.org/latest/security/configuration/system-indices/)
- [jq manual](https://jqlang.org/manual/)
- [GNU `wc` manual](https://www.gnu.org/software/coreutils/manual/html_node/wc-invocation.html)
- [GNU SHA-2 utilities manual](https://www.gnu.org/software/coreutils/manual/html_node/sha2-utilities.html)
- [NDJSON specification](https://github.com/ndjson/ndjson-spec/blob/master/README.md)

## Issues Found

- Saved-object scoping was stated too broadly. Changed it to say that dashboard-related objects are tenant-scoped or can be associated with one or more workspaces, because some saved-object types are global and a saved object can be associated with multiple workspaces.
- The post used "curator," which is not a documented OpenSearch tenant or workspace access level. Replaced it with the documented read-only and read/write access terminology.
- The import warning described conflicts as title-based. Normal saved-object conflicts use object type and ID, with origin handling for applicable object types, so the warning now refers to conflicting saved-object IDs.
- The version-compatibility explanation did not distinguish migration direction. Clarified that compatible newer Dashboards versions migrate older exports and that an export carrying a migration version newer than the target fails to import.
- The OpenSearch Dashboards 3.5 dataset model was described incorrectly. Logs and traces datasets use `index-pattern` saved objects with signal-specific metadata and schema mappings; correlations are separate, importable/exportable `correlations` saved objects. Updated the migration advice to include or deliberately recreate both and to select correlations explicitly when they are not reached from the dashboard's outgoing reference graph.
- The post characterized Saved Objects routes as private even though OpenSearch Dashboards publishes an OpenAPI specification for import and export. Removed that characterization while preserving the warning against direct system-index edits.

## Review Notes

- Both OpenSearch REST examples are valid current syntax. `_resolve/index` accepts wildcard expressions and resolves indexes, aliases, and data streams. `_field_caps` accepts wildcard targets and comma-separated fields.
- `_field_caps` defaults `include_unmapped` to `false`. Add `include_unmapped=true` when a migration test must explicitly report fields that are absent from some matched indexes; use field-mapping APIs when exact mapping parameters also need comparison.
- The `wc`, `jq`, and `sha256sum` commands are valid. `jq -c .` is a JSON-stream syntax check, not a strict assertion that every physical line contains exactly one JSON object, and `wc -l` counts newline characters.
- The official workspace documentation requires Security multi-tenancy to be disabled when workspaces are enabled, so tenant and workspace instructions in the post are alternative scoping models.
- Dashboard variables were introduced in OpenSearch Dashboards 3.7 and are available in Observability workspaces; the validation checklist applies only when the source dashboard uses that feature.
