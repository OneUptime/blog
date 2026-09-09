# Commit and Roll Back Manual Kuzu Transactions from C++

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kuzu, C++, Cypher, Graph Database, ACID Transactions

Description: Control Kuzu transactions from C++ with checked Cypher statements, rollback cleanup, and clear connection ownership.

Several related database writes should succeed together or leave no changes. In Kuzu's C++ API, the portable public way to control a manual transaction is to issue transaction statements through the same `Connection` used for the work: `BEGIN TRANSACTION`, then `COMMIT` or `ROLLBACK`.

This guide targets Kuzu 0.11.3. It uses result checks instead of assuming that `Connection::query()` throws for every query error. The upstream C++ API returns a `QueryResult` whose success flag and error message must be inspected.

## Understand transaction ownership

Without an explicit begin statement, Kuzu automatically wraps a statement in a transaction. Two successful independent inserts therefore do not become one atomic operation merely because they use the same connection.

A manual transaction changes that boundary. Kuzu documents multiple readers and a single writer, with `BEGIN TRANSACTION READ ONLY` available for consistent multi-query reads. A transaction belongs to the connection that began it. See the [transaction reference](https://kuzudb.github.io/docs/cypher/transaction/).

For application code, assign one component responsibility for starting and finishing the transaction. A helper that unexpectedly commits a caller's transaction makes larger workflows difficult to reason about. Avoid nested transaction wrappers and do not share a connection between interleaved logical operations.

## Check every query result

This complete C++20 example inserts two records atomically, then deliberately rolls back another insert:

```cpp
#include "kuzu.hpp"
#include <cassert>
#include <cstdint>
#include <functional>
#include <memory>
#include <stdexcept>
#include <string>

using kuzu::main::Connection;
using kuzu::main::QueryResult;

std::unique_ptr<QueryResult> checked(Connection& conn,
                                     const std::string& query) {
    auto result = conn.query(query);
    if (!result->isSuccess()) {
        throw std::runtime_error(result->getErrorMessage());
    }
    return result;
}

void transaction(Connection& conn, const std::function<void()>& work) {
    checked(conn, "BEGIN TRANSACTION");
    try {
        work();
        checked(conn, "COMMIT");
    } catch (...) {
        // A query error may already have aborted the transaction.
        // Preserve the original failure if rollback also reports an error.
        try {
            auto rollback = conn.query("ROLLBACK");
            (void)rollback;
        } catch (...) {
        }
        throw;
    }
}

int main() {
    kuzu::main::SystemConfig config;
    config.bufferPoolSize = 64 * 1024 * 1024;
    kuzu::main::Database db(":memory:", config);
    Connection conn(&db);
    checked(conn, "CREATE NODE TABLE Item(id INT64 PRIMARY KEY)");
    transaction(conn, [&] {
        checked(conn, "CREATE (:Item {id: 1})");
        checked(conn, "CREATE (:Item {id: 2})");
    });

    checked(conn, "BEGIN TRANSACTION");
    checked(conn, "CREATE (:Item {id: 3})");
    checked(conn, "ROLLBACK");

    auto count = checked(conn, "MATCH (i:Item) RETURN count(*)");
    assert(count->getNext()->getValue(0)->getValue<int64_t>() == 2);
}
```

The rollback in the explicit demonstration is checked, because its success is part of the intended operation. Cleanup in the exception path is different: its main job is to avoid masking the original error. Production code should record any cleanup failure through a non-throwing logger and retire the connection if its state is uncertain.

Beginning the transaction happens outside the `try` block intentionally. If the begin fails, this helper did not acquire transaction ownership and must not roll back a transaction that may belong to another caller.

## Exercise the failure path

Replace the body passed to `transaction` with two inserts using the same primary key. The second insert should fail and the first must not remain committed:

```cpp
transaction(conn, [&] {
    checked(conn, "CREATE (:Item {id: 10})");
    checked(conn, "CREATE (:Item {id: 10})");
});
```

Catch the exception in the caller before querying the final count. A test that checks only whether an exception occurred misses the atomicity requirement. Inspect the database state after failure as well.

For real user values, prepare statements and bind parameters instead of formatting input into Cypher text. Prepared execution returns a result that needs the same success check. Transaction control remains on the same connection regardless of whether the statements are prepared.

## Keep work inside the boundary small

Fetch remote data and perform slow application computation before starting a write transaction when possible. Holding the transaction open while waiting for a network response occupies the single writer unnecessarily.

A read-only transaction is appropriate when several queries must observe a consistent database state. It cannot be upgraded into a write workflow by casually issuing an insert. Choose the correct transaction type at the beginning and keep the same ownership discipline.

Do not use `CHECKPOINT` as a substitute for commit. For an on-disk database, commit makes the transaction's changes durable; checkpoint concerns moving WAL contents into the database files. The `:memory:` database in this example does not persist data after the process exits. Requesting checkpoints inside an active transaction is not a way to strengthen the transaction boundary.

## Handle retries at the operation level

A retry must rerun the complete transaction with fresh application state. Retrying only the last failed statement can omit preceding writes after an automatic abort. Decide whether the operation is idempotent and whether the failure is actually transient before retrying.

Also distinguish a database transaction from external side effects. Sending a notification or writing a separate file inside `work()` is not rolled back by Kuzu. Record an intent in the database and arrange its external processing according to your application's consistency requirements.

If a commit result is uncertain because the process terminates or loses its surrounding execution context, inspect durable application identifiers before replaying the operation. A transaction wrapper cannot resolve ambiguity outside the lifetime of the process.

## Conclusion

Use checked transaction statements on one owned connection, inspect every query result, and preserve the original error during rollback cleanup. Verify both committed state and rollback state so that the transaction boundary is tested as a behavior.

## Official Documentation

- [Transaction semantics](https://kuzudb.github.io/docs/cypher/transaction/)
- [C++ connection API](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/main/connection.h)
- [QueryResult API](https://github.com/kuzudb/kuzu/blob/v0.11.3/src/include/main/query_result.h)
- [Connections and concurrency](https://kuzudb.github.io/docs/concurrency/)
