# Validation Summary: How to Use Read Concerns with Transactions in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions)
- MongoDB Node.js Driver
- Read Concerns (local, majority, snapshot)
- Write Concerns
- Causally Consistent Sessions
- Replica Sets

## Sources Consulted
- MongoDB Read Concern documentation: https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB Transactions and Read Concern documentation: https://www.mongodb.com/docs/manual/core/transactions/#read-concern
- MongoDB Node.js Driver Session/Transaction API: https://www.mongodb.com/docs/drivers/node/current/fundamentals/transactions/
- MongoDB Causal Consistency documentation: https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/

## Issues Found

### 1. Incorrect claim about snapshot and atomicity (line 21)
- **What was wrong:** The description of `snapshot` read concern included "(required for multi-document atomicity guarantees)". Multi-document atomicity is guaranteed by the transaction mechanism itself, regardless of read concern level. The `snapshot` read concern provides *isolation* (consistent point-in-time reads), not atomicity.
- **What was changed:** Replaced with "(provides snapshot isolation for consistent reads within a transaction)".

### 2. Double abort bug in example code (lines 61-76)
- **What was wrong:** Inside the stock check `if` block, `session.abortTransaction()` was called before throwing an error. The thrown error is then caught by the `catch` block, which calls `session.abortTransaction()` again. Calling abort on an already-aborted transaction throws an error in the MongoDB Node.js driver.
- **What was changed:** Removed the `await session.abortTransaction()` call from inside the `if` block, allowing the `catch` block to handle the abort cleanly.

### 3. Incorrect default read concern in Summary (line 107)
- **What was wrong:** The Summary stated "MongoDB transactions default to `snapshot` read concern." This is incorrect. If no read concern is specified at the transaction level, MongoDB inherits from the session level, then the client level. The client-level default for primary reads is `local`, not `snapshot`.
- **What was changed:** Corrected to clarify that the default is inherited (typically `local`) and that `snapshot` must be explicitly set.

## Review Notes
- The post correctly identifies all three valid read concerns for transactions (local, majority, snapshot) and their behavior.
- The causalConsistency session option usage is correct.
- The code examples use correct MongoDB Node.js driver API syntax throughout.
- The post could benefit from mentioning that `snapshot` read concern requires `writeConcern: { w: "majority" }` for the snapshot guarantees to hold upon commit, but this is not an error since the examples already use majority write concern.
