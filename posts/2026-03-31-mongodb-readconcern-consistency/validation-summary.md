# Validation Summary: How to Tune MongoDB readConcern for Consistency

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (readConcern, readPreference, causal consistency, transactions)
- MongoDB Shell (mongosh)
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB documentation on readConcern: https://www.mongodb.com/docs/manual/reference/read-concern/
- MongoDB documentation on readConcern "linearizable": https://www.mongodb.com/docs/manual/reference/read-concern-linearizable/
- MongoDB documentation on readConcern "available": https://www.mongodb.com/docs/manual/reference/read-concern-available/
- MongoDB documentation on db.collection.find(): https://www.mongodb.com/docs/manual/reference/method/db.collection.find/
- MongoDB documentation on cursor.readConcern(): https://www.mongodb.com/docs/manual/reference/method/cursor.readConcern/
- MongoDB documentation on causal consistency: https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/
- MongoDB documentation on setDefaultRWConcern: https://www.mongodb.com/docs/manual/reference/command/setDefaultRWConcern/

## Issues Found

1. **Incorrect description of `linearizable` readConcern**: The post described linearizable as a "read your own writes guarantee" that "reflects the latest write from the same client." This is wrong — linearizable is a stronger guarantee: it ensures reads reflect all successful majority-acknowledged writes from *any* client that completed before the read started (real-time ordering / linearizability). "Read your own writes" is what causal consistency provides, which is a weaker guarantee. Fixed in the mermaid diagram, section description, and summary.

2. **Incorrect default readConcern for sharded clusters**: The post claimed the default readConcern is `available` for sharded cluster reads. Since MongoDB 3.6 (released 2017), the default is `local` for all deployment types including sharded clusters. Fixed to state `local` is the default for all deployments.

3. **Incorrect mongosh `find()` syntax for readConcern**: The post passed `readConcern` as the second parameter to `db.collection.find()`, but in mongosh, the second parameter is the projection, not options. readConcern passed this way would be silently ignored. Fixed to use the correct `cursor.readConcern("level")` method. Affected the `local` and `majority` readConcern shell examples.

4. **Incorrect mongosh `findOne()` syntax for readConcern**: The linearizable example passed `readConcern` and `maxTimeMS` as the second parameter to `findOne()`, which is the projection parameter in mongosh. Replaced with `find().readConcern("linearizable").maxTimeMS(10000).next()` which correctly sets both options via cursor methods.

5. **Incorrect readPreference "nearest" comment**: A code comment said "Read majority-committed data from the nearest secondary" but readPreference `"nearest"` selects the nearest member regardless of role — it could be the primary or a secondary. Fixed comment to say "nearest member (primary or secondary)."

6. **Mixed mongosh/Node.js driver syntax in causal consistency example**: The example used `db.getMongo().startSession()` (mongosh API) but then used `.collection("orders")` (Node.js driver API) and `await` (unnecessary in mongosh). Fixed to use consistent mongosh syntax: `sessionDb.orders` for collection access and `cursor.readConcern().readPref()` for options.

## Review Notes
- The Node.js driver examples (using `db.collection("orders").findOne(filter, options)`) are correct — the driver accepts readConcern in the options parameter, unlike the mongosh shell.
- The `snapshot` readConcern transaction example uses correct mongosh session/transaction syntax.
- The `setDefaultRWConcern` and `getDefaultRWConcern` admin commands are correct.
- The performance implications table is reasonable, though actual performance varies by workload and deployment topology.
- Starting in MongoDB 5.0, `snapshot` readConcern can also be used outside transactions with `atClusterTime` for certain read operations, but the post's characterization as "transactions only" is acceptable for a general tutorial.
