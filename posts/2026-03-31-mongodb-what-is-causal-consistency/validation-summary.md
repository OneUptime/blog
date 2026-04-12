# Validation Summary: What Is Causal Consistency in MongoDB

## Status
validated

## Post Type
Tutorial / Explainer

## Technologies Covered
- MongoDB (causal consistency feature, introduced in v3.6)
- MongoDB Node.js Driver (`startSession`, `causalConsistency` option)
- PyMongo (`start_session`, `causal_consistency` parameter)
- Replica Sets (causal ordering across secondaries)

## Sources Consulted
- MongoDB official documentation on causal consistency: https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/
- MongoDB official documentation on client sessions: https://www.mongodb.com/docs/manual/reference/method/Mongo.startSession/
- MongoDB Node.js Driver API reference for `startSession`: https://mongodb.github.io/node-mongodb-native/
- PyMongo documentation for `start_session`: https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html

## Issues Found

1. **Causal consistency described as requiring explicit enablement** — The post stated causal consistency "must be explicitly enabled." In fact, `causalConsistency` defaults to `true` when calling `startSession()` in both the Node.js driver and PyMongo. Changed the text to clarify that it is enabled by default, and the explicit option is for clarity.

2. **Incorrect claim about reads being routed to primary** — The post stated "If a secondary hasn't caught up yet, the read waits or is routed to the primary." This is incorrect. When a secondary receives a read with `afterClusterTime`, it blocks until replication catches up to that timestamp. If it cannot catch up within `maxTimeMS`, the operation times out with an error — it is not re-routed to the primary. Corrected the sentence to reflect the actual timeout behavior.

## Review Notes
- The post does not mention that causal consistency guarantees require `majority` read concern and `majority` write concern to be fully effective. This is an important caveat documented by MongoDB, but not strictly an error in the post's current claims — it is an omission that could be addressed in a future revision.
- The four causal guarantees (read your own writes, monotonic reads, monotonic writes, writes follow reads) are accurately described.
- Both code examples (Node.js and Python) are syntactically correct and use current, non-deprecated APIs.
- The distinction between causal consistency and multi-document transactions is accurately stated.
