# Validation Summary: How to Keep a Data Lineage Catalog Fresh Without Manual Updates

## Status
validated

## Post Type
Technical architecture and operations guide. The post contains implementation patterns, illustrative JSON data models, reconciliation rules, and freshness metrics, so it qualifies for technical review despite having no executable application code or terminal commands.

## Technologies Covered
- OpenMetadata ingestion, incremental extraction, soft deletion, and metadata versioning
- DataHub stateful ingestion and lineage management
- OpenLineage events and dataset lifecycle facets
- dbt manifest and catalog artifacts
- Snowflake query history and warehouse metadata
- Apache Airflow and Dagster orchestration definitions
- BI metadata APIs, SQL/schema change signals, CI/CD, and JSON

## Sources Consulted
- OpenMetadata metadata ingestion guide: https://docs.open-metadata.org/latest/how-to-guides/admin-guide/how-to-ingest-metadata — scheduling, source filters, connection tests, and configurable soft deletion.
- OpenMetadata ingestion framework deployment: https://docs.open-metadata.org/latest/deployment/ingestion — internally and externally managed ingestion workflows.
- OpenMetadata incremental extraction: https://docs.open-metadata.org/latest/connectors/ingestion/workflows/metadata/incremental-extraction — full-state comparison, successful-run checkpoints, safety margins, structural changes, and connector-specific support.
- OpenMetadata features: https://docs.open-metadata.org/latest/features — soft deletion, metadata preservation, version history, lineage, and scheduled ingestion.
- DataHub stateful ingestion: https://github.com/datahub-project/datahub/blob/master/metadata-ingestion/docs/dev_guides/stateful.md — checkpoint state and removal of tables/views absent since the last successful run.
- DataHub lineage guide: https://docs.datahub.com/docs/features/feature-guides/lineage — automatic lineage and conflicts between manual and programmatic edits.
- OpenLineage object model: https://openlineage.io/docs/spec/object-model/ — design-time JobEvent/DatasetEvent versus runtime RunEvent, dataset identity, and source-code version metadata.
- OpenLineage lifecycle state change facet: https://openlineage.io/docs/spec/facets/dataset-facets/lifecycle_state_change/ — dataset lifecycle metadata.
- dbt manifest artifact: https://docs.getdbt.com/reference/artifacts/manifest-json — project resources and dependency representation.
- dbt catalog artifact: https://docs.getdbt.com/reference/artifacts/catalog-json — warehouse table/view and column metadata.
- Snowflake QUERY_HISTORY view: https://docs.snowflake.com/en/sql-reference/account-usage/query_history — query history availability and ingestion latency caveats.
- Author profile: https://github.com/nawazdhandala — verified the linked profile resolves.

## Issues Found
1. **Deployment-time publication conflated OpenLineage runtime and design-time events.** The delivery-workflow list included events from jobs and processing engines without distinguishing execution observations from declared metadata. Updated that bullet to specify design-time JobEvent and DatasetEvent where supported, and runtime RunEvent emission as jobs execute. The OpenLineage object model explicitly distinguishes these event types and their timing.
2. **Full snapshots were presented as detecting configuration filters unconditionally.** A snapshot using the same exclusions or restricted permissions cannot discover assets outside its visible scope. Reworded the sentence to describe recovery of current-state drift after missed events or cursor gaps, and require a separate audit of filters and permissions. This follows the ingestion guide's explicit source filtering and access scope controls; a snapshot also cannot reconstruct all historical changes that occurred during a gap.

## Review Notes
- Parsed both fenced JSON examples successfully with Python's JSON parser. They are illustrative application data models, not native DataHub, OpenMetadata, Snowflake, or OpenLineage configuration schemas. The text blocks are pseudocode, sample records, tasks, and dashboard output; there are no CLI flags or executable programs to test.
- The source-of-truth split, watermarks, producer assertions, evidence leases, grace periods, review states, debouncing, canary checks, and destructive-change safeguards are proposed architecture and operational policies. The post does not establish these as built-in catalog features; implementing them requires application logic and connector-specific integration.
- OpenMetadata's documented extraction algorithm and DataHub's successful-checkpoint comparison support the product claims. DataHub stateful ingestion must be enabled/configured for the selected source; successful checkpoints do not independently prove that permissions or extraction scope were complete.
- DataHub documents that incremental_lineage can help avoid overwrites for supported sources, but also retains older edges. It is not equivalent to the proposed producer-scoped lease and expiry model.
- The example freshness intervals and coverage percentages are illustrative targets, not product guarantees. Snowflake Account Usage QUERY_HISTORY can lag by up to 45 minutes, so its use would require adjusting the illustrative 30-minute lineage target or selecting a suitable lower-latency source. An overlap window only compensates for delays within that window; completeness requires accounting for the actual source latency and visibility.
- All eight official-documentation links resolve to relevant resources. OpenMetadata latest links currently redirect to versioned v2.0.x documentation; DataHub's lineage page currently displays 1.7.0 and OpenLineage's lifecycle page displays 1.53.0. These moving documentation links should be rechecked when implementing against a pinned release.
- Airflow, Dagster, and BI platforms are referenced as categories of metadata producers; the post specifies no platform-specific API signatures, deployment commands, or configuration that require execution testing.
- README changes were limited to the two technical corrections above. No sections were added or reorganized.
