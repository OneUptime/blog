# Validation Summary: How to Use Built-In Roles in MongoDB

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MongoDB (authorization / RBAC system)
- MongoDB Shell (`mongosh`) commands for user and role management

## Sources Consulted
- MongoDB official documentation: Built-In Roles — https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB official documentation: Privilege Actions — https://www.mongodb.com/docs/manual/reference/privilege-actions/
- MongoDB official documentation: `db.createUser()` — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB official documentation: `db.grantRolesToUser()` — https://www.mongodb.com/docs/manual/reference/method/db.grantRolesToUser/
- MongoDB official documentation: `db.revokeRolesFromUser()` — https://www.mongodb.com/docs/manual/reference/method/db.revokeRolesFromUser/

## Issues Found
1. **`readWrite` actions list used `delete` instead of `remove`**: The post listed `delete` as one of the privilege actions granted by the `readWrite` role. In MongoDB's authorization model, the correct privilege action name is `remove`, not `delete`. While the shell CRUD methods are `deleteOne()`/`deleteMany()`, the underlying privilege action has always been `remove`. Changed `delete` to `remove` on line 43.

## Review Notes
- The privilege action lists for `read`, `readWrite`, and `dbAdmin` are simplified subsets rather than exhaustive lists. For example, `read` also grants `changeStream`, `dbHash`, and `killCursors`; `readWrite` also grants `convertToCapped`, `dropIndex`, and `renameCollectionSameDB`; `dbAdmin` also grants `dropDatabase`, `enableProfiler`, `listIndexes`, `planCacheRead`, `planCacheWrite`, `reIndex`, and `renameCollectionSameDB`. The post does not claim to be exhaustive, but readers looking for a complete reference should consult the official documentation.
- The description of `userAdminAnyDatabase` as "equivalent to a superuser for access control" is accurate — this role can grant itself any privilege, making it effectively a superuser. This is worth calling out because it may surprise users who assume only `root` is a superuser role.
- All `db.createUser()` syntax and role assignment patterns are correct for current MongoDB versions.
- All cluster-level and all-database roles are correctly noted as requiring assignment on the `admin` database.
