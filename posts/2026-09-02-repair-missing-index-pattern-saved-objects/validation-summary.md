# Validation Summary: Repair Missing OpenSearch Dashboard Index Patterns

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- OpenSearch Resolve Index API
- OpenSearch Field Capabilities API
- OpenSearch indexes, aliases, and data streams
- OpenSearch Dashboards index patterns and saved objects
- OpenSearch Dashboards NDJSON export and import
- OpenSearch Dashboards tenants, workspaces, and saved-object permissions
- OpenSearch system indexes and saved-object migrations

## Sources Consulted
- OpenSearch Resolve Index API: https://docs.opensearch.org/latest/api-reference/index-apis/resolve-index/
- OpenSearch Field Capabilities API: https://docs.opensearch.org/latest/api-reference/search-apis/field-caps/
- OpenSearch Dashboards management: https://docs.opensearch.org/latest/dashboards/management/management-index/
- OpenSearch index patterns: https://docs.opensearch.org/latest/dashboards/management/index-patterns/
- OpenSearch Dashboards Saved Objects API schema: https://github.com/opensearch-project/OpenSearch-Dashboards/blob/6fd768a665a05f517656ca6440c61065ee9c70f0/docs/openapi/saved_objects/saved_objects.yml
- OpenSearch Dashboards custom index-pattern ID implementation: https://github.com/opensearch-project/OpenSearch-Dashboards/blob/6fd768a665a05f517656ca6440c61065ee9c70f0/src/plugins/index_pattern_management/public/components/create_index_pattern_wizard/components/step_time_field/components/advanced_options/advanced_options.tsx
- OpenSearch Dashboards missing-reference import workflow: https://github.com/opensearch-project/OpenSearch-Dashboards/blob/6fd768a665a05f517656ca6440c61065ee9c70f0/src/plugins/saved_objects_management/public/management_section/objects_table/components/flyout.tsx
- OpenSearch Dashboards issue 707, changing an existing visualization's index pattern: https://github.com/opensearch-project/OpenSearch-Dashboards/issues/707
- OpenSearch workspace asset copying: https://docs.opensearch.org/latest/dashboards/workspace/manage-workspace/#copying-assets-between-workspaces
- OpenSearch workspace APIs: https://docs.opensearch.org/latest/dashboards/workspace/apis/
- OpenSearch workspace ACLs: https://docs.opensearch.org/latest/dashboards/workspace/workspace-acl/
- OpenSearch workspace configuration: https://docs.opensearch.org/latest/dashboards/workspace/workspace/#enabling-workspaces
- OpenSearch Dashboards multi-tenancy: https://docs.opensearch.org/latest/security/multi-tenancy/tenant-index/
- OpenSearch system indexes: https://docs.opensearch.org/latest/security/configuration/system-indices/
- OpenSearch `date_nanos` field type: https://docs.opensearch.org/latest/field-types/supported-field-types/date-nanos/

## Issues Found
- The diagnostic text treated a successful REST response as proof that the wildcard resolved. The Resolve Index API can return no matching entries, and `_field_caps` defaults `allow_no_indices` to `true`. Added `allow_no_indices=false` to the field-capabilities request and required checking that `_resolve/index` lists an intended target and that the requested fields have compatible mappings.
- The post said the supported scope-copy workflow preserves object IDs. Workspace duplication can assign destination IDs while rewriting included references. Clarified that switching to an existing scope leaves IDs intact, whereas supported copies preserve the reference graph and may consistently remap IDs.
- The post implied that recreating an index pattern always produces a different ID and omitted the supported custom-ID recovery path. Qualified the default-ID behavior and documented **Show advanced settings > Custom index pattern ID**, which allows the replacement object to reuse the missing ID when that ID is known and available.
- The fallback procedure assumed every existing visualization can switch to a new index pattern. Classic aggregation-based visualizations do not support that operation in place. Added the supported import-time missing-reference mapping workflow and clarified that unsupported classic visualizations must be recreated against the replacement pattern.
- The validation checklist required the time field to be mapped only as `date`. OpenSearch Dashboards also supports `date_nanos`. Updated the check to accept `date` or `date_nanos` while rejecting incompatible mappings.
- The deletion-permission recommendation mentioned only tenant write access even though the guide also covers workspaces. Added the corresponding workspace `library_write` permission.
- Tenants and workspaces were potentially ambiguous as simultaneous scoping mechanisms. Clarified that the applicable context depends on the deployment's isolation model; current workspace documentation requires Security multi-tenancy to be disabled.

## Review Notes
- Both REST examples use current, non-deprecated OpenSearch APIs. `_resolve/index` and `_field_caps` support wildcard targets, and `_field_caps` supports indexes, aliases, and data streams.
- Exporting with related objects, importing NDJSON through Dashboards, resolving import conflicts, and avoiding direct writes to `.opensearch_dashboards*` are all supported recommendations.
- Saved-object exports are migration- and version-sensitive, so the post's warning to test imports on the destination Dashboards version is correct.
- All links in the post's Official References section resolved to relevant current OpenSearch documentation.
