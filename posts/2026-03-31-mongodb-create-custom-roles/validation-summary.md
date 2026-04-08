# Validation Summary: How to Create Custom Roles in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (authorization and role-based access control)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB Manual: Privilege Actions — https://www.mongodb.com/docs/manual/reference/privilege-actions/
- MongoDB Manual: db.createRole() — https://www.mongodb.com/docs/manual/reference/method/db.createRole/
- MongoDB Manual: db.createUser() — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB Manual: db.grantRolesToUser() — https://www.mongodb.com/docs/manual/reference/method/db.grantRolesToUser/
- MongoDB Manual: db.grantPrivilegesToRole() — https://www.mongodb.com/docs/manual/reference/method/db.grantPrivilegesToRole/
- MongoDB Manual: db.getRole() — https://www.mongodb.com/docs/manual/reference/method/db.getRole/
- MongoDB Manual: db.dropRole() — https://www.mongodb.com/docs/manual/reference/method/db.dropRole/

## Issues Found
1. **`aggregate` is not a valid MongoDB privilege action.** The post listed `aggregate` as both a privilege action in the `analyticsReader` role example and in the "Common Actions" reference table. MongoDB does not define an `aggregate` privilege action; aggregation pipelines are authorized through the `find` action on the source collection (with additional actions like `insert` and `remove` needed for stages such as `$out` and `$merge`). Removed `"aggregate"` from the `analyticsReader` role's actions array (leaving just `"find"`) and removed the `aggregate` row from the actions table.

## Review Notes
- The `analyticsReader` example already inherits the built-in `read` role, which grants `find` on all collections in the database. The explicit `find` privilege on `metrics` is therefore redundant but not incorrect — it serves as a clear illustration for the reader.
- All other privilege actions listed (`find`, `insert`, `update`, `remove`, `createIndex`, `dropCollection`, `listCollections`, `serverStatus`) are valid MongoDB privilege actions.
- The `db.createRole()`, `db.createUser()`, `db.grantRolesToUser()`, `db.grantPrivilegesToRole()`, `db.getRole()`, and `db.dropRole()` method signatures and arguments are all correct.
- The resource document formats (`{ db: ..., collection: ... }` and `{ cluster: true }`) are correct.
- The note about cluster-scoped roles needing to be created in the `admin` database is accurate.
