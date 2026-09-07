# Validation Summary: How to Capture Runtime Data Lineage for Dynamic SQL That Static Parsers Miss

## Status
validated

## Post Type
Technical implementation guide

## Technologies Covered
- Python and Psycopg 3
- SQL, dynamic SQL, stored procedures, and transactions
- OpenLineage Python client, run events, dataset naming, and Lineage Job Facet
- PostgreSQL session metadata, logging, and partition pruning
- MySQL 8.4 general query log and Performance Schema
- Runtime data lineage and pipeline observability

## Sources Consulted
- OpenLineage run cycle: https://openlineage.io/docs/spec/run-cycle/
- OpenLineage Python client usage: https://openlineage.io/docs/client/python/usage/
- OpenLineage client configuration: https://openlineage.io/docs/client/python/configuration/
- OpenLineage naming conventions: https://openlineage.io/docs/spec/naming/
- OpenLineage Lineage Job Facet: https://openlineage.io/docs/spec/facets/job-facets/lineage/
- Psycopg parameter binding: https://www.psycopg.org/psycopg3/docs/basic/params.html
- Psycopg SQL composition: https://www.psycopg.org/psycopg3/docs/api/sql.html
- Psycopg connections: https://www.psycopg.org/psycopg3/docs/api/connections.html
- Psycopg transactions: https://www.psycopg.org/psycopg3/docs/basic/transactions.html
- PostgreSQL logging and application_name: https://www.postgresql.org/docs/current/runtime-config-logging.html#GUC-APPLICATION-NAME
- PostgreSQL partition pruning: https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL CALL: https://www.postgresql.org/docs/current/sql-call.html
- MySQL general query log: https://dev.mysql.com/doc/refman/8.4/en/query-log.html
- MySQL statement event tables: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-statement-tables.html
- MySQL statement history retention: https://dev.mysql.com/doc/refman/8.4/en/performance-schema-events-statements-history-table.html
- Python datetime: https://docs.python.org/3/library/datetime.html
- Python set operations: https://docs.python.org/3/library/stdtypes.html#set-types-set-frozenset
- Author profile link: https://github.com/nawazdhandala

## Issues Found
1. **Overbroad claim about bind values.** Restricted the claim to the named table dependencies in this example. Parameters can affect row-level lineage and execution-time partition pruning. Also qualified the static-parser claim to identifiers selected from runtime configuration.
2. **Resolved identifiers overstated as proof of physical access.** Clarified that SQL references establish dependencies at the captured boundary, while physical reads and writes require execution-level evidence. This avoids treating every referenced object as proof of actual data access.
3. **Run identity did not match across examples.** The database example used a fixed UUID while the event example generated a different one. Generate the UUID once before connecting and reuse it in Run(runId=run_id). Added the missing psycopg import. This preserves the correlation the post recommends and avoids reusing the fixed example ID across invocations.
4. **Normalized SQL marker could be mistaken for executable Psycopg SQL.** Explicitly identified the question mark as a normalization marker. Psycopg execution examples correctly retain percent-s value placeholders.
5. **Backend configuration prerequisite was omitted.** Added that OpenLineageClient needs a configured transport to send events to the intended backend. The event example remains a skeleton, and its execution placeholder now explicitly requires confirming transaction commit before COMPLETE.
6. **Transactional audit retention was ambiguous.** Replaced the transaction-scoped audit-table wording with an ordinary audit table written in the same transaction and collected after commit. Explained that rollback removes its rows, so failed-attempt evidence needs separate capture.

## Review Notes
- Checked all five Python code blocks with Python's AST parser after the edits; all parsed successfully. Examples depend on application-provided variables, a database schema, and configured services. No live database execution or backend delivery test was performed.
- Confirmed the documented event_v2 imports, UUID helper, Dataset/Job/Run/RunEvent construction, UTC ISO timestamps, and START/COMPLETE/FAIL/ABORT lifecycle. No deprecated API was identified in the examples.
- The PostgreSQL namespace and database.schema.table dataset names follow OpenLineage naming conventions. The examples assume the connected database is warehouse and that target tables and compatible columns already exist.
- Confirmed that the Lineage Job Facet can represent explicit per-target input edges. Backend support for displaying and processing that facet should be checked in the deployed version.
- Confirmed identifier quoting with sql.Identifier and separate value binding. The introductory string-interpolation example assumes allowlisted sources are trusted, valid SQL identifiers; the later example demonstrates the supported composition API.
- PostgreSQL application_name fits the documented size limit and can be exposed in logs. When using pooled connections, integrations must refresh session correlation metadata for each run.
- MySQL 8.4 documentation confirms that the general query log is disabled by default and records receipt order. Performance Schema history is bounded and requires the relevant instrumentation and consumers; it can monitor stored-program statements.
- The normalized SQL and stored-procedure call are illustrative, not standalone database setup scripts. There are no terminal commands or configuration blocks in the post to execute.
- All listed official documentation URLs resolved to the relevant resources; the author URL redirects to the intended GitHub profile. Example producer and database host URLs are placeholders, not operational services.
- Official documentation served OpenLineage 1.53.0, PostgreSQL 18, MySQL 8.4, and Psycopg 3 documentation labeled 3.3.6.dev1 at review time. The reviewed Psycopg APIs are established APIs and do not require the development-only transaction status feature.
- Declared/observed evidence labels, reconciliation alerts, canary checks, and coverage counters are application design recommendations, not automatic guarantees of OpenLineage. Exactly-once canary results require suitable backend deduplication and delivery handling.
