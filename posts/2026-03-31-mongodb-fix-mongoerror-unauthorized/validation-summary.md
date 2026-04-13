# Validation Summary: How to Fix MongoError: Unauthorized in MongoDB

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- MongoDB (server, mongosh shell)
- MongoDB Role-Based Access Control (RBAC)
- MongoDB Atlas
- mongod.conf configuration

## Sources Consulted
- [MongoDB Privilege Actions](https://www.mongodb.com/docs/manual/reference/privilege-actions/) - verified valid privilege action names
- [MongoDB Built-in Roles](https://www.mongodb.com/docs/manual/reference/built-in-roles/) - verified role descriptions and included privileges
- [MongoDB db.createRole()](https://www.mongodb.com/docs/manual/reference/method/db.createRole/) - verified custom role creation syntax
- [MongoDB db.grantRolesToUser()](https://www.mongodb.com/docs/manual/reference/method/db.grantRolesToUser/) - verified role granting syntax
- [MongoDB db.getUser()](https://www.mongodb.com/docs/manual/reference/method/db.getUser/) - verified user info retrieval
- [MongoDB rolesInfo command](https://www.mongodb.com/docs/manual/reference/command/rolesInfo/) - verified role inspection syntax
- [MongoDB usersInfo command](https://www.mongodb.com/docs/manual/reference/command/usersInfo/) - verified user privilege inspection
- [MongoDB Security Configuration](https://www.mongodb.com/docs/manual/reference/configuration-options/#security-options) - verified authorization config format

## Issues Found
- **Invalid privilege action "aggregate" in custom role example (Step 5):** The `actions` array in the `db.createRole()` example included `"aggregate"`, which is not a valid MongoDB privilege action. The `find` privilege action already covers aggregation operations (all pipeline stages except `$out`, `$merge`, and `$collStats`). Changed `actions: ["find", "aggregate"]` to `actions: ["find"]`.

## Review Notes
- The error code 13 for Unauthorized and the distinction from Authentication failed (error code 18) are correctly described.
- All built-in role descriptions are accurate simplifications of their actual privilege sets.
- The `db.getUser()` example in Step 1 uses `use mydb`, which only works if the user was created on `mydb`. Most deployments create users on the `admin` database. This isn't technically wrong but could be confusing for users who created their user on `admin`.
- The statement "If authorization is disabled, all authenticated users have full access" is slightly imprecise - when authorization is disabled, all connections have full access regardless of authentication status. The practical advice to enable it for production is correct.
- All mongosh command syntax (`grantRolesToUser`, `createUser`, `createRole`, `rolesInfo`, `usersInfo`) is correct and current.
- Atlas UI steps and role names are accurate.
