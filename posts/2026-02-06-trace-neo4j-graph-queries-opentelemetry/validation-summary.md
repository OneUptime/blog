# Validation Summary: How to Trace Neo4j Graph Database Queries with OpenTelemetry

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- OpenTelemetry tracing and database semantic conventions
- Neo4j graph database and Cypher
- Neo4j Java Driver
- Neo4j Python Driver
- Neo4j JavaScript Driver
- OpenTelemetry Collector OTLP, batch processor, and attributes processor

## Sources Consulted
- OpenTelemetry database client span semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- OpenTelemetry database semantic convention stability migration guide: https://opentelemetry.io/docs/specs/semconv/non-normative/db-migration/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Java manual instrumentation documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Python tracing API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- Neo4j Java Driver managed transactions documentation: https://neo4j.com/docs/java-manual/current/transactions/
- Neo4j Java Driver performance recommendations for specifying a database: https://neo4j.com/docs/java-manual/current/performance/
- Neo4j Python Driver API documentation for ResultSummary and Result.consume(): https://neo4j.com/docs/api/python-driver/current/api.html
- Neo4j JavaScript Driver result summary and counters documentation: https://neo4j.com/docs/javascript-manual/current/result-summary/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/

## Issues Found
- The examples used older database semantic convention attributes (`db.system`, `db.name`, `db.statement`, and `db.operation`). Updated them to the current names (`db.system.name`, `db.namespace`, `db.query.text`, and `db.operation.name`) and changed returned row count to `db.response.returned_rows`.
- The Java usage example labeled the span with a database name but opened a default session. Updated it to create the session with `SessionConfig.builder().withDatabase("social-graph").build()`.
- The Java manual instrumentation created spans but did not make them current inside the wrapped operation. Added `Scope` usage so any work inside the wrapper runs under the Neo4j span.
- The Python example accessed `summary.plan.operator_type`, but the Neo4j Python driver exposes `ResultSummary.plan` as a dictionary. Changed it to safely read `summary.plan.get("operatorType")`.
- The Python shortest-path query used an unbounded variable-length pattern. Added a depth bound (`*1..5`) to avoid the Neo4j performance warning for unbounded shortest-path traversals.
- The Node.js example imported `neo4j-driver` without using it. Removed the unused import and added an optional database-name argument so the example can set `db.namespace`.
- The performance guidance said queries without a leading labeled lookup perform a full graph scan. Reworded this to say Neo4j may fall back to `AllNodesScan` when the planner cannot use a label or index lookup.

## Review Notes
The dependency versions shown in the Maven snippet are pinned examples rather than the latest available versions. They remain usable for the APIs shown, but future updates should periodically refresh OpenTelemetry and Neo4j driver versions.
