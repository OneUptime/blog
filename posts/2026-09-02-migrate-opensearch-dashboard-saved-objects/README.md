# How to Export and Recreate OpenSearch Dashboards, Visualizations, and Index Patterns Across Environments

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Index Management

Description: Move OpenSearch Dashboards saved objects as a referenced NDJSON bundle, then reconnect data sources and validate mappings, scope, permissions, and panels in the target environment.

---

An OpenSearch dashboard is a graph of saved objects. The dashboard references visualizations and saved searches; those objects reference index patterns, data sources, and fields. Exporting only the top-level dashboard often produces a successful import with broken panels.

Move the reference graph, then recreate the environment-specific data plane underneath it.

## Inventory the source scope

Dashboard-related saved objects are tenant-scoped or associated with one or more workspaces. Before exporting, record:

- OpenSearch and OpenSearch Dashboards versions;
- active tenant or workspace;
- data source names and types;
- index-pattern titles, time fields, and matched aliases/streams;
- dashboard IDs/titles and dependent visualizations/searches;
- relevant advanced settings and required plugins;
- read-only and read/write access for the destination scope.

Do not assume a private-tenant dashboard is present in the global tenant. Switch to the exact source context before opening Saved Objects.

## Prepare the target data first

Saved objects do not include the log/span documents, index templates, ISM policies, Alerting monitors, notification channels, or Security roles required by the dashboard.

On the target cluster, create or verify stable aliases/data streams and inspect field compatibility:

```http
GET _resolve/index/logs-prod-*
POST logs-prod-*/_field_caps?fields=@timestamp,service.name,log.level,duration_ms
```

If the target uses different index names, decide whether to create an equivalent alias or deliberately remap the index pattern. Keeping a stable logical contract across environments reduces saved-object edits.

## Export the complete saved-object bundle

In **Dashboards Management > Saved objects**:

1. Select the dashboard(s) to move.
2. Export them with related/referenced objects included.
3. Save the resulting NDJSON as an immutable release artifact.

Inspect the file without reformatting it into one JSON array:

```bash
wc -l observability-dashboard.ndjson
jq -c . observability-dashboard.ndjson >/dev/null
sha256sum observability-dashboard.ndjson
```

Use the platform-equivalent checksum tool where `sha256sum` is unavailable. Store the source/target versions and checksum with the release record. Saved-object exports can reveal field names, queries, URLs, and operational topology, so handle them as internal configuration.

## Import into a test scope

Use a disposable target tenant/workspace first:

1. Open **Dashboards Management > Saved objects** in that target context.
2. Select **Import** and upload the NDJSON.
3. Choose the documented conflict policy deliberately; do not overwrite production objects with conflicting saved-object IDs just to make the import complete.
4. When multiple data sources are enabled, choose the intended target data source during import.
5. Review missing-reference and conflict results before accepting the bundle.

OpenSearch's multiple-data-source workflow explicitly supports exporting NDJSON from one Saved Objects page and importing it into another while selecting a target data source.

Keep source and target Dashboards versions compatible. Saved objects undergo migrations as Dashboards evolves: older exports are migrated when imported into a compatible newer version, while exports whose migration version is newer than the target fail to import. Never copy `.opensearch_dashboards*` system-index documents between environments as a substitute for the supported import workflow.

## Repair index-pattern differences visibly

An index pattern has a saved-object ID as well as a title such as `logs-prod-*`. Dependent visualizations reference the ID. If the import includes the related pattern, keep the reference graph intact and then validate its target expression and time field.

If the destination must use a different pattern, create it through Dashboards Management and update/re-save dependent visualizations in the test scope. Editing undocumented NDJSON internals by search-and-replace is risky: IDs can occur in structured references and embedded serialized state, and schemas are version-sensitive.

For OpenSearch Dashboards 3.5+ observability workspaces with dataset management enabled, OpenSearch-backed logs and traces datasets store signal-specific configuration in `index-pattern` saved objects, while trace-to-logs correlations are separate, exportable saved objects. Include these objects in the migration—or recreate them where target-specific differences require it—and validate each logs dataset's schema mappings and correlations in the target environment. Because correlations reference datasets and dashboards do not reference the correlations, verify that the NDJSON contains them or select them explicitly for export.

## Validate every layer

Run the target review with both read/write and read-only access:

- every dashboard and visualization opens;
- each panel uses the intended target data source;
- global time filter works with the mapped date field;
- filters do not fail on missing/conflicting fields;
- data stream rollover does not change the pattern target;
- trace/log links resolve under target dataset mappings;
- tenant/workspace visibility is correct;
- unrelated environment data is not visible;
- saved queries and dashboard variables produce expected results.

Use a fixed historical interval and known document counts for a repeatable comparison. “The chart has a line” is not a migration test.

## Promote and keep rollback simple

After the test import passes, export the reviewed target bundle, checksum it, and import that artifact into the destination production tenant/workspace. Preserve the pre-change export for rollback.

Resolve conflicts by creating reviewed copies or using an explicit replacement plan. Deleting old saved objects before validating incoming references turns a reversible import into an outage.

## Automate around supported boundaries

Treat NDJSON as a build artifact even when import/export remains a UI-controlled operation:

- version it alongside the index-template/schema contract;
- lint each line as JSON;
- scan for forbidden source hostnames and tenant identifiers;
- deploy data templates/aliases before saved objects;
- run target smoke queries after import;
- record the exact Dashboards version that produced it.

This provides reproducibility without editing component system indexes.

## Official References

- [OpenSearch Dashboards management and Saved Objects](https://docs.opensearch.org/latest/dashboards/management/management-index/)
- [OpenSearch multiple data sources and NDJSON import](https://docs.opensearch.org/latest/dashboards/management/multi-data-sources/)
- [OpenSearch index patterns](https://docs.opensearch.org/latest/dashboards/management/index-patterns/)
- [OpenSearch Dashboards multi-tenancy](https://docs.opensearch.org/latest/security/multi-tenancy/tenant-index/)
- [OpenSearch workspaces](https://docs.opensearch.org/latest/dashboards/workspace/workspace/)
- [OpenSearch system indexes](https://docs.opensearch.org/latest/security/configuration/system-indices/)
