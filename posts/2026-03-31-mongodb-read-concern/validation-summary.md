# Validation Summary: How to Configure Read Concern in MongoDB Transactions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (multi-document transactions, read concern)
- MongoDB Node.js Driver
- Replica Sets / Sharded Clusters

## Sources Consulted
- MongoDB Manual: Transactions — https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB Manual: Read Concern — https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB Manual: Read Concern "available" — https://www.mongodb.com/docs/manual/reference/read-concern-available/
- MongoDB Manual: Read Concern "snapshot" — https://www.mongodb.com/docs/manual/reference/read-concern-snapshot/
- MongoDB Manual: Read Concern "linearizable" — https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/
- MongoDB Node.js Driver Documentation — https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

1. **Incorrect default read concern for transactions**: The post stated "MongoDB uses `snapshot` read concern by default for multi-document transactions." Per MongoDB documentation, the default read concern for transactions is inherited from the session/client level, which defaults to `local`, not `snapshot`. All transactions provide snapshot isolation regardless of the read concern level, but the actual default read concern is `local`. Fixed the explanation in the "Default Read Concern for Transactions" section and the Summary.

2. **Mermaid diagram: `snapshot` labeled as "required in transactions"**: The `snapshot` read concern is recommended but not required for transactions. MongoDB transactions also support `local` and `majority` read concerns. Changed to "recommended for transactions".

3. **Mermaid diagram: `available` labeled as "sharded clusters only"**: The `available` read concern is not limited to sharded clusters. It works on all deployments, but only differs from `local` on sharded clusters (where it skips orphaned document checks). Changed to "differs from local only on sharded clusters".

4. **Code comment "Default: snapshot read concern"**: Updated to reflect that the default is inherited (`local` unless overridden), not `snapshot`.

5. **Summary section repeated incorrect default**: Changed "MongoDB transactions default to `snapshot` read concern" to accurately state the default is `local` with snapshot isolation provided regardless.

## Review Notes
- The `maxTimeMS` option in the linearizable example is described as "required" in a code comment. It is strongly recommended by MongoDB docs but not technically enforced by the server. Left as-is since the advice to always use it is correct.
- All code examples use correct MongoDB Node.js driver API patterns (`session` passed as an option, `startTransaction` with options object, `commitTransaction`/`abortTransaction` flow).
- The explanation of snapshot isolation semantics (two reads returning identical results despite concurrent writes) is accurate.
- The note that read concern levels cannot be mixed within a single transaction is correct per MongoDB documentation.
