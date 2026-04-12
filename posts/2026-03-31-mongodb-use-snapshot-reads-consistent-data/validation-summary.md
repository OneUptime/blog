# Validation Summary: How to Use Snapshot Reads for Consistent Data in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, snapshot isolation)
- MongoDB Node.js Driver (`mongodb` npm package)
- PyMongo (Python MongoDB driver)
- WiredTiger storage engine (mentioned in context of cache pressure)

## Sources Consulted
- MongoDB Documentation: Read Concern "snapshot" — https://www.mongodb.com/docs/manual/reference/read-concern-snapshot/
- MongoDB Documentation: Transactions and Read Concern — https://www.mongodb.com/docs/manual/core/transactions/#read-concern
- MongoDB Documentation: Read Concern "snapshot" outside transactions (5.0+) — https://www.mongodb.com/docs/manual/reference/read-concern-snapshot/#read-concern-outside-transactions
- MongoDB Node.js Driver API: session.withTransaction() — https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- PyMongo Documentation: Transactions — https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html

## Issues Found

1. **Per-operation readConcern inside a transaction (JavaScript example)**: The `findOne` call within the `withTransaction` callback specified `readConcern: { level: "snapshot" }` at the operation level. MongoDB does not allow setting read concern on individual operations within a transaction — read concern is set at the transaction level only (via the options passed to `withTransaction`). Removed the per-operation `readConcern` from the `findOne` options since the transaction-level `readConcern` was already correctly set.

2. **Incorrect claim that causal consistency is required for snapshot reads outside transactions**: The section on MongoDB 5.0+ snapshot reads outside transactions stated that a "causally consistent session" was required and set `causalConsistency: true` in the code example. This is incorrect — snapshot reads outside transactions work with any session; causal consistency is an orthogonal feature and not a prerequisite. Changed the text to say "by using a session" and removed the `{ causalConsistency: true }` option from `startSession()`.

3. **Missing `await` on `session.endSession()`**: In the outside-transactions JavaScript example, `session.endSession()` was called without `await`. In the modern MongoDB Node.js driver, `endSession()` returns a Promise and should be awaited. Added `await` for correctness and consistency with the main transaction example.

## Review Notes
- The Python example calls `session.commit_transaction()` explicitly inside a `with session.start_transaction()` block. In modern PyMongo (4.x+), the context manager auto-commits on normal exit, making the explicit call redundant but harmless. This is a minor style issue, not a bug.
- The limitations section is rendered inside a code block (`text`), which is an unusual formatting choice but not a technical error.
