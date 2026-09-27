# Validation Summary: How to Filter OpenSearch Log Events by Timestamp with PPL Date Functions

## Status
validated

## Post Type
Technical guide with PPL queries and OpenSearch HTTP API examples.

## Technologies Covered
- OpenSearch date mappings, Search API, and Get Index Mappings API.
- OpenSearch Piped Processing Language (PPL), date/time functions, and Explain API.
- OpenSearch Dashboards time filters.
- OpenTelemetry log timestamps.

## Sources Consulted
- [PPL date and time functions](https://docs.opensearch.org/latest/sql-and-ppl/ppl/functions/datetime/) — timestamp construction, UTC interpretation, UTC_TIMESTAMP, and DATE_SUB.
- [SQL and PPL data types](https://docs.opensearch.org/latest/sql-and-ppl/datatypes/) — date fields map to TIMESTAMP.
- [PPL where command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/where/) — Boolean filtering and missing-value handling.
- [PPL sort command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/sort/) — ascending prefix syntax.
- [PPL fields command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/fields/) — field projection.
- [PPL head command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/head/) — limiting the input population.
- [PPL stats command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/stats/) — counts, aliases, and grouping.
- [PPL search command](https://docs.opensearch.org/latest/sql-and-ppl/ppl/commands/search/) — source selection and additional relative-time modifiers.
- [Get Index Mappings API](https://docs.opensearch.org/latest/api-reference/index-apis/get-mapping/) — index mapping inspection.
- [Search API](https://docs.opensearch.org/latest/api-reference/search-apis/search/) — GET requests, size, and source field arrays.
- [Date field type](https://docs.opensearch.org/latest/mappings/supported-field-types/date/) — date storage and precision.
- [SQL and PPL API](https://docs.opensearch.org/latest/sql-and-ppl/sql-and-ppl-api/index/) — PPL Explain endpoint and engine-dependent plans.
- [Analyzing logs in Discover](https://docs.opensearch.org/latest/observing-your-data/exploring-observability-data/discover-logs/) — PPL querying and the time range selector.
- [OpenTelemetry Logs Data Model](https://opentelemetry.io/docs/specs/otel/logs/data-model/) — event Timestamp versus ObservedTimestamp.

## Issues Found
- The absolute-boundary explanation described UTC as a session assumption and asked readers to confirm the query environment's time zone. Current PPL documentation specifies UTC interpretation for date/time function inputs and outputs. Changed the introduction to “a ten-minute window in UTC” and corrected the explanation to state PPL's UTC semantics while retaining the browser display time-zone check. No query changes were necessary.

## Review Notes
- Verified all query examples against the documented syntax: quoted identifiers, timestamp constructors, comparisons, interval subtraction, ascending sort, projection, head limits, and grouped counts. The HTTP endpoints and JSON bodies match the API documentation.
- The half-open comparisons include the start and exclude the end, including fractional-second values below the upper boundary. Missing timestamps do not make an ordinary range predicate true.
- Event time and observation time are correctly distinguished; actual field names and mappings remain pipeline-specific, as the post explains.
- Absolute bounds reproduce the selected time interval. Identical results also require an unchanged dataset; late arrivals, updates, and retention can change counts between executions.
- The additional UI time-filter warning is appropriate. Display time zones should be reconciled with UTC query boundaries.
- No explicit release is targeted. Availability of relative-time syntax and optimization behavior depends on the installed version and query engine; the existing caveats are appropriate. No deprecated API use was identified in the examples.
- All four technical documentation links in the post resolved to the intended official resources.
- This was a documentation-based review. Queries were not executed against a live OpenSearch cluster, and no fixture results or performance measurements are claimed.
