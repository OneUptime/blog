# Validation Summary: How to Implement the Principle of Least Privilege in MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (server, mongosh shell)
- MongoDB built-in roles (`root`, `dbOwner`, `readWriteAnyDatabase`, `readWrite`, `backup`, `clusterMonitor`, `dbAdmin`, `userAdminAnyDatabase`, `dbAdminAnyDatabase`)
- MongoDB custom roles (`db.createRole()`)
- MongoDB user management (`db.createUser()`, `db.getUsers()`, `db.getUser()`, `db.revokeRolesFromUser()`)
- MongoDB network configuration (`mongod.conf` `net.bindIp`)
- MongoDB Atlas IP access lists

## Sources Consulted
- MongoDB documentation on Privilege Actions (https://www.mongodb.com/docs/manual/reference/privilege-actions/)
- MongoDB documentation on Built-In Roles (https://www.mongodb.com/docs/manual/reference/built-in-roles/)
- MongoDB documentation on `db.createRole()` (https://www.mongodb.com/docs/manual/reference/method/db.createRole/)
- MongoDB documentation on `db.createUser()` (https://www.mongodb.com/docs/manual/reference/method/db.createUser/)
- MongoDB documentation on `db.getUsers()` (https://www.mongodb.com/docs/manual/reference/method/db.getUsers/)
- MongoDB documentation on `db.revokeRolesFromUser()` (https://www.mongodb.com/docs/manual/reference/method/db.revokeRolesFromUser/)
- MongoDB documentation on Network Configuration (`net.bindIp`) (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.bindIp)

## Issues Found
- **Table listed `aggregate` as a MongoDB privilege action**: In the "Identify Access Requirements Per Role" table, the "Background jobs" row listed `aggregate` as one of the actions needed. However, `aggregate` is not a valid MongoDB privilege action. Aggregation operations require the `find` privilege action on the source collection (plus additional privileges for specific stages like `$out` or `$merge`). Changed `aggregate` to `update` to align with the other valid privilege actions in the table and reflect typical background job needs.

## Review Notes
- All `db.createRole()`, `db.createUser()`, `db.getUsers()`, `db.getUser()`, and `db.revokeRolesFromUser()` calls use correct syntax and valid parameters.
- All built-in role names (`root`, `dbOwner`, `readWriteAnyDatabase`, `readWrite`, `backup`, `clusterMonitor`, `dbAdmin`, `userAdminAnyDatabase`, `dbAdminAnyDatabase`) are correct and their descriptions are accurate.
- The `mongod.conf` `net.bindIp` configuration uses the correct YAML format and field name.
- The post uses hardcoded example passwords in code snippets. While acceptable for a tutorial, a production note about using environment variables or secrets management could be beneficial in the future.
- The `db.getUser()` call with `{ showPrivileges: true }` correctly shows the expanded privilege set for auditing purposes.
