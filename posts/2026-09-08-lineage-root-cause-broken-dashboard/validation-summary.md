# Validation Summary: How to Use Data Lineage to Find the Root Cause of a Broken Dashboard

## Status
validated

## Post Type
Technical troubleshooting guide. The post includes lineage models, operational investigation details, and an illustrative HTTP service interface, so it qualifies for technical review despite having no executable pipeline code or CLI commands.

## Technologies Covered
- Tableau Metadata API, GraphQL, and Tableau Catalog lineage
- Power BI lineage view, semantic models, refreshes, and gateways
- OpenMetadata lineage API
- OpenLineage jobs, runs, dataset facets, column lineage, and data quality assertions
- Data warehouses, SQL transformations, CDC, and partitioned pipelines
- HTTP/1.1 and custom lineage service design

## Sources Consulted
- Tableau Metadata API introduction: https://help.tableau.com/current/api/metadata_api/en-us/
- Tableau metadata model: https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_model.html
- Tableau Metadata API permissions: https://help.tableau.com/current/api/metadata_api/en-us/docs/meta_api_permissions.html
- Tableau lineage impact analysis: https://help.tableau.com/current/server/en-us/dm_lineage.htm
- Power BI data lineage: https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-data-lineage
- Power BI data source impact analysis: https://learn.microsoft.com/en-us/power-bi/collaborate-share/service-data-source-impact-analysis
- OpenMetadata lineage API, official search-indexed documentation: https://docs.open-metadata.org/v1.12.x/api-reference/lineage/index
- OpenMetadata lineage SDK documentation: https://docs.open-metadata.org/v1.12.x/api-reference/sdk/python/api-reference/lineage-mixin
- OpenLineage object model: https://openlineage.io/docs/spec/object-model/
- OpenLineage column lineage facet: https://openlineage.io/docs/spec/facets/dataset-facets/column_lineage_facet/
- OpenLineage Data Quality Assertions facet: https://openlineage.io/docs/spec/facets/dataset-facets/data_quality_assertions/
- RFC 9112, HTTP/1.1 request-line and Host requirements: https://www.rfc-editor.org/rfc/rfc9112.html#name-request-line

## Issues Found
1. **Native lineage granularity:** The native-tool instructions could imply that Power BI lineage view exposes visual-to-measure mappings. Clarified that its graph shows artifact relationships and that report and semantic-model definitions are needed for the finer mapping.
2. **Failed producer run interpreted as unhealthy data:** A failed run can leave a valid prior output intact. Replaced the categorical health statement with a requirement to check the consumed output and the failed run's actual effect.
3. **Root cause inferred from volume alone:** The example declared the warehouse transformation to be the broken boundary despite only establishing normal source volume. Changed it to a leading candidate requiring checks of relevant values, join keys, and the affected segment. Adjusted the conclusion to distinguish failure localization from confirmation of the underlying cause.
4. **Ambiguous custom endpoint and malformed HTTP example:** Explicitly identified the endpoint and field identifier as illustrative and requiring implementation. Put the entire request target on one line and added the HTTP/1.1 version and Host header, following RFC 9112. The endpoint is not claimed to be a built-in Tableau, OpenMetadata, or OpenLineage API.
5. **Historical evidence selection:** Replaced the unqualified latest schema and last successful run with the schema consumed by the relevant run and the successful run as of the requested time, avoiding present-day evidence in a historical investigation.

## Review Notes
- Confirmed Tableau's GraphQL metadata and upstream/downstream relationships, including permission filtering or obfuscation. Collector permissions and unsupported SQL can limit completeness.
- Confirmed that Power BI lineage displays workspace artifacts, external dependencies, refresh metadata, and gateway information subject to permissions. Its documentation requires Pro licensing and an Admin, Member, or Contributor workspace role; Viewer access is insufficient.
- Confirmed the OpenLineage distinction between jobs and individual runs, timestamped run events, dataset facets, direct and indirect column influences, and dataset assertions with optional column scope.
- Historical graph reconstruction, edge confidence, health colors, and the proposed response fields are application design requirements, not guarantees of the cited APIs. Collection, retention, and backend support determine availability.
- The text diagrams, schema version v81, commit abc123, timestamps, and incident counts are illustrative scenario data rather than product versions or executable examples.
- All eight documentation links were checked. Tableau, Microsoft, and OpenLineage pages resolved to the intended resources. Direct browser retrieval of the OpenMetadata latest link and its versioned equivalent returned a tool internal error; official search-indexed lineage and SDK documentation supported the review. The original plausible latest URL was retained because the retrieval error does not establish that it is broken.
- No live Tableau, Power BI, warehouse, or custom lineage service was available for integration testing. Review covered documented capabilities, the investigation logic, and HTTP syntax; it does not claim a live incident replay or endpoint execution.
