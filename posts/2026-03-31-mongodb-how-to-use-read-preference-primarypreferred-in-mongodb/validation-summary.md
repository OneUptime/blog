# Validation Summary: How to Use Read Preference 'primaryPreferred' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, read preferences)
- MongoDB Node.js Driver (`mongodb` npm package)
- mongosh (MongoDB Shell)
- MongoDB connection string URI options

## Sources Consulted
- MongoDB Read Preference documentation: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Read Preference reference (primaryPreferred): https://www.mongodb.com/docs/manual/core/read-preference/#primarypreferred
- MongoDB maxStalenessSeconds documentation: https://www.mongodb.com/docs/manual/core/read-preference-staleness/
- MongoDB Node.js Driver ReadPreference API: https://mongodb.github.io/node-mongodb-native/

## Issues Found

### 1. `maxStalenessSeconds` value below minimum (line 60)
- **What was wrong:** The example used `maxStalenessSeconds: 30`. MongoDB requires a minimum value of 90 seconds for `maxStalenessSeconds`; specifying a value below 90 raises an error at the driver/server level.
- **What was changed:** Updated the value from `30` to `90`.
- **Why:** Per MongoDB documentation, "The minimum maxStalenessSeconds value is 90 seconds: specifying a smaller maxStalenessSeconds value will raise an error." Using 30 would cause a runtime error, making the example non-functional.

### 2. Misleading use case bullet about reducing primary read load (line 71)
- **What was wrong:** The bullet "You want to reduce primary read load when secondary data is close enough" incorrectly describes `primaryPreferred` behavior. Since `primaryPreferred` always routes reads to the primary when it is available, it does not reduce primary read load. Distributing reads away from the primary is the purpose of `secondaryPreferred` or `nearest`.
- **What was changed:** Replaced with "You want consistent reads from the primary with automatic failover to secondaries," which accurately describes the `primaryPreferred` use case.
- **Why:** The original text could mislead readers into choosing `primaryPreferred` for load distribution, when they actually need `secondaryPreferred` or `nearest` for that goal.

## Review Notes
- The comparison table omits `secondaryPreferred`, which is the closest alternative to `primaryPreferred` (inverse behavior). This is not an error since the table is labeled "Related Preferences," but readers might benefit from seeing the contrast in a future update.
- The `ReadPreference` constructor's second argument (tag sets) is passed as an empty array `[]` in the maxStaleness example. While this works, passing `null` or omitting it would be slightly cleaner. Not changed since it is functionally correct.
- All code examples use `require()` (CommonJS) syntax. This is fine and widely compatible, though modern Node.js projects may prefer ES module `import` syntax. Not changed since both are valid.
