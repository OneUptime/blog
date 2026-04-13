# Validation Summary: How to Use Read Preference 'secondaryPreferred' in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, read preferences)
- MongoDB Node.js Driver
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Read Preference documentation: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Node.js Driver ReadPreference API: https://mongodb.github.io/node-mongodb-native/
- MongoDB Connection String URI reference: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB maxStalenessSeconds documentation: https://www.mongodb.com/docs/manual/core/read-preference-staleness/

## Issues Found
No technical issues found.

## Review Notes
- The description of secondary selection as "randomly selected" is a simplification. MongoDB drivers actually use a server selection algorithm that picks from eligible secondaries within the `localThresholdMS` latency window. This is acceptable for an introductory tutorial.
- The `maxStalenessSeconds` value of 90 is the minimum valid value (heartbeatFrequencyMS 10s + idleWritePeriodSeconds 10s, rounded up to 90s minimum by the server). This is correct but worth noting for readers who might try lower values.
- All code examples use the `mongodb` Node.js driver API correctly, including the `ReadPreference` constructor, static constants, cursor methods, and connection string parameters.
