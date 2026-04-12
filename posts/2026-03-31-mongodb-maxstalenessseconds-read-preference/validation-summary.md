# Validation Summary: How to Use maxStalenessSeconds with Read Preferences in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (replica sets, read preferences)
- MongoDB Node.js driver (`mongodb` npm package)
- mongosh (MongoDB Shell)
- MongoDB connection string URI options

## Sources Consulted
- MongoDB Server Selection Specification (staleness algorithm): https://github.com/mongodb/specifications/blob/master/source/server-selection/server-selection.md
- MongoDB Manual — Read Preference Staleness: https://www.mongodb.com/docs/manual/core/read-preference-staleness/
- MongoDB Manual — Read Preferences: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Node.js Driver — ReadPreference API: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connect/#read-preference
- MongoDB Manual — cursor.readPref(): https://www.mongodb.com/docs/manual/reference/method/cursor.readPref/

## Issues Found

### 1. Incorrect staleness estimation formula (Section: "How Staleness Is Estimated")
**What was wrong:** The formula was given as:
```
estimatedStaleness = (now - secondary.lastWriteDate) - (primary.lastWriteDate - primary.optime)
```
This had three errors:
- Used `now` instead of `S.lastUpdateTime` (the timestamp when the driver received the secondary's `hello` response)
- Used `primary.lastWriteDate - primary.optime`, which is not part of the specification — it should be `P.lastUpdateTime - P.lastWriteDate`
- Omitted the `+ heartbeatFrequencyMS` tolerance term

**What was changed:** Replaced with the correct formula from the MongoDB Server Selection Specification:
```
estimatedStaleness = (S.lastUpdateTime - S.lastWriteDate) - (P.lastUpdateTime - P.lastWriteDate) + heartbeatFrequencyMS
```
Also added the no-primary formula (`SMax.lastWriteDate - S.lastWriteDate + heartbeatFrequencyMS`) and clarified what each variable represents.

**Why:** The original formula would produce different staleness values than what the driver actually computes, which could mislead readers trying to understand or debug staleness behavior.

## Review Notes
- The query-level `cursor.readPref("secondary", [], { maxStalenessSeconds: 90 })` syntax works in the legacy `mongo` shell. In modern `mongosh`, the third parameter to `cursor.readPref()` is formally documented as `hedgeOptions`. The example may still work in practice, but readers using mongosh should prefer setting `maxStalenessSeconds` via the connection string or `Mongo()` constructor.
- The error name `NoReplicaSetSecondaryOk` on the "Behavior When All Secondaries Exceed the Threshold" section is used descriptively. In practice, the Node.js driver raises a `MongoServerSelectionError` when no server matches. The concept is correct even if the exact error class differs.
- All Node.js driver code examples use correct, current API patterns for the `mongodb` driver (v5+/v6+).
- The 90-second minimum, compatible read preference modes, and fallback behaviors are all accurate per the specification.
