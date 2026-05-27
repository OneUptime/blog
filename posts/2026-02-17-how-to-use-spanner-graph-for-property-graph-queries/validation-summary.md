# Validation Summary: How to Use Spanner Graph for Property Graph Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Spanner
- Spanner Graph
- GoogleSQL
- Graph Query Language (GQL)
- SQL/PGQ property graph schemas

## Sources Consulted
- Google Cloud Spanner Graph overview: https://cloud.google.com/spanner/docs/graph
- Google Cloud Spanner Graph schema overview: https://cloud.google.com/spanner/docs/graph/schema-overview
- Google Cloud Spanner GQL schema statements reference: https://cloud.google.com/spanner/docs/reference/standard-sql/graph-schema-statements
- Google Cloud Spanner GQL query statements reference: https://cloud.google.com/spanner/docs/reference/standard-sql/graph-query-statements
- Google Cloud Spanner GQL patterns reference: https://cloud.google.com/spanner/docs/reference/standard-sql/graph-patterns
- Google Cloud Spanner GQL subqueries reference: https://cloud.google.com/spanner/docs/reference/standard-sql/graph-subqueries
- Google Cloud Spanner GQL within SQL reference: https://cloud.google.com/spanner/docs/reference/standard-sql/graph-sql-queries
- Google Cloud Spanner create, update, and drop graph schema guide: https://cloud.google.com/spanner/docs/graph/create-update-drop-schema
- Google Cloud Spanner Graph and ISO standards: https://cloud.google.com/spanner/docs/graph/iso-standards

## Issues Found
- The `Person` and `Post` node definitions did not expose `PersonId` and `PostId` as properties, but later queries referenced `friend.PersonId` and `fof.PersonId`. Updated the property lists to include the element ID columns.
- The `Post` table was used as both a node definition and an edge definition without a distinct edge name. Spanner Graph requires unique element names when reusing an input table, so the edge definition now uses `Post AS Authored`.
- The shortest-path example used `MATCH SHORTEST`, which is not the Spanner Graph syntax. Updated it to `MATCH ANY SHORTEST` with an unbounded `{1,}` quantifier, which matches the documented path search prefix syntax.
- The examples for combining graph queries with SQL used a standalone `GRAPH` query directly with SQL `UNION ALL` and inside a SQL `IN` subquery. Spanner uses `GRAPH_TABLE` to embed GQL results in SQL, so both examples were rewritten to use `GRAPH_TABLE`.
- A SQL/GQL interoperability comment said the example joined order data, but the query combined graph results with regular SQL rows. Updated the comment to describe the example accurately.
- The graph schema update section implied that adding `Group` and `GroupMembership` to the graph schema was sufficient by itself. Clarified that the underlying tables must be created before adding them to the graph schema.

## Review Notes
Spanner Graph is documented for GoogleSQL-dialect Spanner databases and is available in Spanner Enterprise and Enterprise Plus editions. The post does not mention these edition and dialect constraints; that is worth adding in a future broader editorial pass, but it was not necessary to correct the examples in place.
