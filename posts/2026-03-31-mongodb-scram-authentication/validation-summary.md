# Validation Summary: How to Configure MongoDB SCRAM Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (SCRAM-SHA-1, SCRAM-SHA-256 authentication)
- mongosh (MongoDB Shell)
- Node.js MongoDB driver
- Spring Boot (Spring Data MongoDB)

## Sources Consulted
- MongoDB SCRAM Authentication documentation — https://www.mongodb.com/docs/manual/core/security-scram/
- MongoDB Server Parameters (scramIterationCount, scramSHA256IterationCount) — https://www.mongodb.com/docs/manual/reference/parameters/
- db.createUser() reference — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- db.updateUser() reference — https://www.mongodb.com/docs/manual/reference/method/db.updateUser/
- db.getUser() reference — https://www.mongodb.com/docs/manual/reference/method/db.getUser/
- db.getUsers() reference — https://www.mongodb.com/docs/manual/reference/method/db.getUsers/
- mongosh connection options — https://www.mongodb.com/docs/mongodb-shell/reference/options/
- MongoDB Configuration File Options — https://www.mongodb.com/docs/manual/reference/configuration-options/
- RFC 5802 (SCRAM protocol) — https://www.rfc-editor.org/rfc/rfc5802.html

## Issues Found

1. **Missing `use ecommerce` in Step 3**: `appUser` and `legacyApp` were being created in the `admin` database (carried over from Step 2's `use admin`), but all subsequent steps (connection strings, authSource, --authenticationDatabase) assumed they were in `ecommerce`. Added `use ecommerce` at the top of Step 3 so users are created in the correct database.

2. **Step 4 `use admin` for `db.getUser("appUser")`**: Since `appUser` is in the `ecommerce` database, `db.getUser()` must be called from `ecommerce`, not `admin`. Changed to `use ecommerce` for the getUser call, then `use admin` for the `db.system.users.find()` query which correctly queries all users from the admin database.

3. **`db.getUsers().users` incorrect for mongosh**: In the legacy `mongo` shell, `db.getUsers()` returned `{ users: [...] }`. In `mongosh` (which the blog uses), it returns the array directly. Changed `db.getUsers().users.forEach(...)` to `db.getUsers().forEach(...)`.

4. **`db.updateUser()` without `pwd` when adding new mechanism**: The bulk migration script called `db.updateUser()` with only `mechanisms: ["SCRAM-SHA-256"]` and no password. Per MongoDB documentation, you can only set mechanisms to a subset of existing mechanisms without providing a password. To add a mechanism the user doesn't already have credentials for, you must provide `pwd`. Added `pwd: passwordPrompt()` to the updateUser call.

5. **Spring Boot code fence mislabeled**: The code block was tagged as ` ```yaml ` but contained Java properties format (`key=value`). Changed the fence to ` ```properties `.

6. **SHA-1 labeled "deprecated"**: The comparison table described SHA-1 as "SHA-1 (deprecated)". MongoDB has not formally deprecated SCRAM-SHA-1; it is maintained for backward compatibility and described as legacy. Changed to "SHA-1 (legacy)".

7. **Password change section used wrong database**: `db.changeUserPassword("appUser", ...)` was called after `use admin`, but `appUser` is in `ecommerce`. Changed to `use ecommerce`.

## Review Notes
- The `showCredentials: false` option in `db.getUser()` is redundant (it defaults to false), but is not incorrect and may serve as documentation of intent.
- The SCRAM authentication flow diagram is accurate per RFC 5802, with an acceptable simplification of the combined nonce in the ServerFirst message.
- The PBKDF2 iteration counts (10,000 for SHA-1, 15,000 for SHA-256) and version compatibility claims (3.0+ and 4.0+ respectively) are all correct per MongoDB documentation.
- The `mongod.conf` format using a comma-separated string for `authenticationMechanisms` is the documented format.
- Special characters in passwords (like `!` encoded as `%21`) are correctly handled in the Node.js driver example.
