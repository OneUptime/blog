# Validation Summary: How to Compare OpenSearch PPL API Results with Log Explorer When Rows Disappear

## Status
validated

## Post Type
Technical troubleshooting guide with REST API and PPL examples.

## Technologies Covered
- OpenSearch and its SQL/PPL plugin
- Piped Processing Language (PPL)
- OpenSearch Dashboards Discover Logs and older Observability interfaces
- Document-level security and Dashboards multi-tenancy

## Sources Consulted
- [Discover Logs](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/discover-logs/): introduction in 3.5, datasets, time selection, aggregation visualization, and workspace prerequisites.
- [SQL and PPL API](https://docs.opensearch.org/latest/sql-and-ppl/sql-and-ppl-api/index/): query endpoint, request envelope, JDBC response, SQL pagination, and PPL explain endpoint.
- [Search command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/search/): source selection.
- [Where command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/where/): filtering and combined Boolean conditions.
- [Date and time functions](https://docs.opensearch.org/latest/sql-and-ppl/ppl/functions/datetime/): TIMESTAMP string conversion.
- [Stats command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/stats/): count(), aliases, and grouped versus ungrouped aggregation.
- [Sort command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/sort/): ascending prefix syntax, multiple sort fields, and optional result count.
- [Fields command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/fields/): column projection.
- [Head command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/head/): limiting returned rows.
- [Parse command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/parse/): unmatched captures and documented overwrite/post-aggregation limitations.
- [SQL settings](https://docs.opensearch.org/latest/sql-and-ppl/settings/): query size, bucket, memory, and engine controls.
- [Document-level security](https://docs.opensearch.org/latest/security/access-control/document-level-security/): role-based restrictions on documents returned by reads.
- [Dashboards multi-tenancy](https://docs.opensearch.org/latest/security/multi-tenancy/tenant-index/): isolation of saved objects and index patterns.

## Issues Found
- The comparison table listed tenant context alongside document-level authorization for an identical request. Tenants isolate Dashboards saved objects; they do not independently filter documents in an otherwise identical PPL request. Moved tenant-specific saved objects to the saved-search/filter investigation entry and qualified this for older interfaces. The newer workspace-based Logs interface requires multi-tenancy to be disabled.
- The comparison table listed selected columns as a possible explanation for fewer displayed rows from the same response. Column selection affects visible fields rather than row count. Removed that item while retaining presentation limits and rendering errors.

## Review Notes
- Both HTTP examples use valid JSON request bodies and documented PPL constructs. The first counts the filtered population; the second sorts ascending, projects fields, and returns at most 20 rows. No example changes were necessary.
- Timestamp literals use the documented string format. The stated UTC assumption and date mapping are required comparison conditions. The source, timestamp field, and body field must exist in the actual dataset.
- The documentation explicitly marks Discover Logs as introduced in 3.5. Dataset selection and automatic visualization for stats queries are accurately described.
- The API documentation supports the distinction between schema/datarows and total matching events, and documents fetch_size for SQL with JDBC. The post appropriately avoids promising generic PPL cursor support.
- Parse restrictions and engine capabilities should be checked against the deployed version, as the post advises. The linked documentation uses the moving latest version.
- All four technical documentation links in the post resolved to the intended official resources. The author link is attribution rather than a technical source.
- Validation was based on official documentation and static inspection. No live OpenSearch cluster or Dashboards session was supplied, so neither query nor UI behavior was executed against a deployment.
