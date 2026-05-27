# Validation Summary: How to Optimize Cloud Spanner Query Performance by Creating Interleaved Tables

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Spanner
- GoogleSQL DDL
- Interleaved tables
- Secondary indexes
- NULL-filtered indexes
- Query execution plans and query statistics

## Sources Consulted
- Cloud Spanner schemas and data model: https://docs.cloud.google.com/spanner/docs/schema-and-data-model
- Cloud Spanner secondary indexes: https://docs.cloud.google.com/spanner/docs/secondary-indexes
- Cloud Spanner GoogleSQL data definition language: https://docs.cloud.google.com/spanner/docs/reference/standard-sql/data-definition-language
- Cloud Spanner query execution plans: https://docs.cloud.google.com/spanner/docs/query-execution-plans
- Cloud Spanner query statistics: https://docs.cloud.google.com/spanner/docs/introspection/query-statistics
- Optimizing schema design for Spanner: https://docs.cloud.google.com/spanner/docs/whitepapers/optimizing-schema-design

## Issues Found
- Corrected several absolute claims that interleaved rows or multi-level hierarchies always touch a single split. Official Spanner documentation describes interleaved rows as usually stored with the parent row and useful for local primary-key joins, but this should not be presented as an unconditional single-split guarantee.
- Corrected the interleaved index DDL syntax by adding the required comma before `INTERLEAVE IN` for GoogleSQL.
- Renamed the covering index example from `AlbumsByReleaseDate` to `AlbumsByReleaseDateCovering` so the examples do not define two indexes with the same name.
- Removed `SingerId` from the `STORING` clause because primary key columns are already stored in secondary indexes.
- Replaced the `EXPLAIN SELECT` snippet with a plain query and guidance to use Spanner Studio's Explain action or a client query mode that returns the plan. The official docs discuss query execution plans and query modes rather than documenting `EXPLAIN` as a GoogleSQL statement prefix.
- Updated the query monitoring wording from "Query Statistics dashboard" to the Query insights page and Spanner query statistics tables, matching current Google Cloud documentation.
- Clarified that a duration-only song lookup should use a non-interleaved index on `Duration`, not a SingerId-prefixed interleaved index.

## Review Notes
The remaining examples use GoogleSQL syntax and current Spanner features. The post stays intentionally high level; future improvements could mention that interleaving is permanent and that large row trees or monotonically changing leading keys need careful schema design to avoid hotspots.
