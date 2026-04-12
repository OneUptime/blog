# Validation Summary: How to Use Read-Your-Own-Writes Consistency in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, causal consistency)
- MongoDB Node.js Driver (`mongodb` npm package)
- PyMongo (Python MongoDB driver)
- Causally consistent sessions
- Read concerns and read preferences

## Sources Consulted
- MongoDB Manual: Causal Consistency and Read and Write Concerns — https://www.mongodb.com/docs/manual/core/causal-consistency-read-write-concerns/
- MongoDB Manual: Read Your Own Writes — https://www.mongodb.com/docs/manual/core/read-isolation-consistency-recency/#read-your-own-writes
- MongoDB Node.js Driver API: ClientSession — https://mongodb.github.io/node-mongodb-native/
- PyMongo Documentation: ClientSession — https://pymongo.readthedocs.io/en/stable/api/pymongo/client_session.html
- MongoDB Manual: Read Concern "majority" — https://www.mongodb.com/docs/manual/reference/read-concern-majority/

## Issues Found
No technical issues found.

## Review Notes
- The Python example does not explicitly set a `readPreference` to read from secondaries, so in that example both reads and writes go to the primary by default. The code is correct but the RYOW guarantee is less meaningful without secondary reads. The JavaScript examples properly demonstrate the `secondaryPreferred` read preference where causal consistency matters most.
- The cross-session RYOW pattern using `advanceClusterTime` and `advanceOperationTime` is an advanced use case. In practice, serializing and transmitting these timestamps between microservices requires care (e.g., they are BSON Timestamp objects, not plain integers).
- All code examples use current, non-deprecated APIs compatible with MongoDB 4.2+ and the latest driver versions.
