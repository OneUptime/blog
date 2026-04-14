# Validation Summary: How to Query Dapr State Store with Filtering

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (state management building block, query API)
- MongoDB, Azure Cosmos DB, PostgreSQL, CockroachDB (as query-capable state stores)
- Python (requests library)
- Go (net/http, encoding/json)
- curl (HTTP API examples)

## Sources Consulted
- Dapr State Management API Reference — https://docs.dapr.io/reference/api/state_api/
- Dapr How-To: Query State — https://docs.dapr.io/developing-applications/building-blocks/state-management/howto-state-query-api/
- Dapr components-contrib state store README — https://github.com/dapr/components-contrib/blob/main/state/README.md
- Dapr PostgreSQL state store docs — https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-postgresql-v2/
- CockroachDB query API GitHub issue — https://github.com/dapr/components-contrib/issues/2075

## Issues Found

1. **MySQL incorrectly listed as a supported query state store**: The post listed MySQL as supporting the state query API, but MySQL is not confirmed to support the query API in official Dapr documentation. Removed MySQL from the supported stores list on line 15.

2. **Inconsistent state store lists**: The introduction (line 15) listed "MongoDB, Azure Cosmos DB, PostgreSQL, CockroachDB, MySQL", the Prerequisites section (line 37) listed only "MongoDB, Cosmos DB, or PostgreSQL", and the Summary (line 267) listed "MongoDB, PostgreSQL, CosmosDB, and CockroachDB". Updated the Prerequisites section to include CockroachDB for consistency with the introduction and summary.

3. **Missing filter operators (NEQ and IN)**: The Filter Operators section listed EQ, GT, LT, GTE, LTE, AND, and OR but omitted the `NEQ` (not equal) and `IN` (membership) operators, which are part of the Dapr query filter specification. Added both operators with examples.

## Review Notes
- The state query API is still in **alpha** (`v1.0-alpha1`), which the post correctly notes. Users should be aware the API may change in future Dapr releases.
- The PostgreSQL state store query support applies to the v1 component, not the v2 component. The post does not distinguish between versions — this could be a source of confusion for users on PostgreSQL v2.
- CockroachDB has known issues with the query API (components-contrib#2075). While it is listed as supported, users may encounter limitations.
- The response examples omit the `etag` field that is included in each result item in the actual API response. This is a minor omission that doesn't affect the tutorial's usefulness.
- The Python and Go code examples are syntactically correct and use the API correctly.
