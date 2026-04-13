# Validation Summary: How to Use SCRAM-SHA-256 Authentication in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (4.0+)
- SCRAM-SHA-256 authentication mechanism
- MongoDB Node.js driver (MongoClient)
- mongod.conf configuration

## Sources Consulted
- MongoDB documentation on SCRAM authentication: https://www.mongodb.com/docs/manual/core/security-scram/
- MongoDB documentation on `createUser`: https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB documentation on `updateUser`: https://www.mongodb.com/docs/manual/reference/method/db.updateUser/
- MongoDB documentation on `authenticationMechanisms` parameter: https://www.mongodb.com/docs/manual/reference/parameters/#mongodb-parameter-param.authenticationMechanisms
- MongoDB documentation on connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Node.js driver documentation: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found
1. **`authenticationMechanisms` in `db.adminCommand` used a string instead of an array** (line 101): The `authenticationMechanisms` server parameter expects an array of strings. The blog had `authenticationMechanisms: "SCRAM-SHA-256"` but it should be `authenticationMechanisms: ["SCRAM-SHA-256"]`. Fixed to use the correct array syntax.

## Review Notes
- The post correctly notes that SCRAM-SHA-256 became available in MongoDB 4.0. In practice, when creating users on MongoDB 4.0+ without specifying `mechanisms`, both SCRAM-SHA-1 and SCRAM-SHA-256 credentials are stored by default. The post's guidance to explicitly set `mechanisms: ["SCRAM-SHA-256"]` is the right approach for enforcing the stronger variant.
- The `mongod.conf` snippet uses `authenticationMechanisms: SCRAM-SHA-256` as a bare string rather than YAML array syntax (`[SCRAM-SHA-256]`). MongoDB's config parser accepts this for a single mechanism, so it is technically valid, but using array syntax would be more explicit and consistent with the `adminCommand` fix.
