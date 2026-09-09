# Validation Summary: Reject Kuzu Bill-of-Materials Inserts That Create Cycles

## Status

validated

## Post Type

Tutorial

## Technologies Covered

- Kuzu 0.11.3 and its synchronous Python API
- Python: dictionaries, sets, iterative reachability, and numeric validation
- Cypher: schema declarations, parameterized MATCH/CREATE queries, and transactions
- Bill-of-materials modeling, directed acyclic graphs, and ACID transaction isolation

## Sources Consulted

- [Kuzu transaction semantics](https://kuzudb.github.io/docs/cypher/transaction/): read-write transaction boundaries, single-writer exclusion, commit, and rollback.
- [Kuzu Python API](https://kuzudb.github.io/docs/client-apis/python/): connections, query execution, in-memory databases, and result iteration.
- [Kuzu connections and concurrency](https://kuzudb.github.io/docs/concurrency/): database and connection ownership and concurrency restrictions.
- [Kuzu MATCH patterns](https://kuzudb.github.io/docs/cypher/query-clauses/match/): directed patterns and bounded recursive relationships.
- [Kuzu CREATE TABLE](https://kuzudb.github.io/docs/cypher/data-definition/create-table/): node primary keys, relationship endpoints, and property declarations.
- [Kuzu v0.11.3 release](https://github.com/kuzudb/kuzu/releases/tag/v0.11.3): target-version existence and upstream archive status.
- [Kuzu v0.11.3 Connection source](https://raw.githubusercontent.com/kuzudb/kuzu/v0.11.3/tools/python_api/src_py/connection.py): execute parameters, context management, and RuntimeError behavior.
- [Kuzu v0.11.3 Database source](https://raw.githubusercontent.com/kuzudb/kuzu/v0.11.3/tools/python_api/src_py/database.py): in-memory initialization, buffer-pool configuration, and context management.
- Installed official `kuzu==0.11.3` package: inspected `QueryResult.close`, `has_next`, and `get_next` implementations and executed the examples.
- [Python math.isfinite](https://docs.python.org/3/library/math.html#math.isfinite): rejection of infinities and NaN.
- [Author profile](https://github.com/nawazdhandala): verified the author link redirects to the intended profile.

## Issues Found

No technical issues found.

## Review Notes

- Left README.md unchanged. The schema, parameter binding, context managers, explicit result cleanup, and transaction statements work in the stated version; the examples do not use the deprecated separate prepare API.
- Installed Kuzu 0.11.3 in an isolated temporary virtual environment and executed both Python code blocks directly from the post under Python 3.13. The published fixture passed and retained exactly two containment edges after rejecting the cycle.
- Additional runtime checks passed for a 30-edge return path, self-loops, duplicate relationships, missing endpoints, zero and negative quantities, NaN, and positive infinity. Every rejected attempt preserved the existing edge count. A valid edge to an existing descendant was accepted, confirming the reachability direction.
- Tested two connections to the same database: while the first held a manual write transaction, the second could not begin another write transaction. The second connection successfully inserted through the helper after the first rolled back.
- The graph argument is correct: assuming an initially acyclic graph, a new parent-to-child edge closes a cycle precisely when the child already reaches the parent, with self-loops rejected separately. The complete adjacency scan avoids a fixed hop limit. Each visited vertex has its neighbors expanded once; duplicate pending entries are skipped. Memory grows with the scanned edge set and reachable vertices, rather than all isolated Part records.
- Transaction ownership also implies exclusive application use of the supplied connection for the duration of the helper. Existing manual transactions and concurrent unrelated operations on that same connection are outside this example's intended use.
- The upstream Kuzu repository was archived on October 10, 2025, and its release page identifies 0.11.3 as the latest release. This is a valid tutorial for the explicitly pinned version, but readers should account for archived upstream maintenance. This caveat does not invalidate the demonstrated APIs or graph algorithm.
- All four linked documentation pages resolved to the intended official resources. There are no terminal commands or configuration snippets in the post requiring separate validation. Large-graph alternatives are conceptual guidance and were not implemented or benchmarked in this review.
