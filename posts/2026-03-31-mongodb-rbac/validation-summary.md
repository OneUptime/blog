# Validation Summary: How to Use Role-Based Access Control (RBAC) in MongoDB

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- MongoDB (RBAC, authorization, authentication)
- MongoDB Shell (mongosh) commands
- mongod configuration (YAML)
- OpenSSL (keyfile generation)
- systemd (service management)

## Sources Consulted
- MongoDB Manual: Role-Based Access Control — https://www.mongodb.com/docs/manual/core/authorization/
- MongoDB Manual: Built-In Roles — https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB Manual: Privilege Actions — https://www.mongodb.com/docs/manual/reference/privilege-actions/
- MongoDB Manual: db.createRole() — https://www.mongodb.com/docs/manual/reference/method/db.createRole/
- MongoDB Manual: db.createUser() — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB Manual: db.getUser() — https://www.mongodb.com/docs/manual/reference/method/db.getUser/
- MongoDB Manual: db.getRoles() — https://www.mongodb.com/docs/manual/reference/method/db.getRoles/
- MongoDB Manual: db.getUsers() — https://www.mongodb.com/docs/manual/reference/method/db.getUsers/
- MongoDB Manual: db.grantPrivilegesToRole() — https://www.mongodb.com/docs/manual/reference/method/db.grantPrivilegesToRole/
- MongoDB Manual: db.revokePrivilegesFromRole() — https://www.mongodb.com/docs/manual/reference/method/db.revokePrivilegesFromRole/
- MongoDB Manual: Resource Document — https://www.mongodb.com/docs/manual/reference/resource-document/
- MongoDB Manual: connectionStatus command — https://www.mongodb.com/docs/manual/reference/command/connectionStatus/
- MongoDB Manual: Deploy Replica Set With Keyfile Authentication — https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set-with-keyfile-access-control/

## Issues Found
1. **Wrong database context for `db.getUser("orderSvc")`**: The auditing section called `db.getUser("orderSvc", { showPrivileges: true })` after `use admin`, but the `orderSvc` user was created in the `ecommerce` database (via `use ecommerce` + `db.createUser()`). The `getUser` method only looks up users in the current database, so this would return null. Fixed by changing `use admin` to `use ecommerce` before the `db.getUser()` call.

## Review Notes
- The role hierarchy diagram is a simplified representation. The `root` role also inherits from `restore` and `backup` roles, which are omitted from the diagram. This is acceptable for a simplified overview.
- The `revokePrivilegesFromRole` example revokes the `remove` action from `shipments`, but the preceding `grantPrivilegesToRole` example only granted `find`, `insert`, and `update` on that collection. The revoke would be a no-op. This is not technically wrong (MongoDB won't error), but could be slightly confusing to readers.
- The "View all users and their assigned roles" section uses `use admin` with `db.getUsers()`, which only returns users in the `admin` database. Since the post's own examples create users in `ecommerce`, not all users would appear. This is a common pattern when all users are centralized in `admin`, but doesn't match the post's own setup.
- The `auditLog` feature mentioned in Best Practices is available only in MongoDB Enterprise. This could be noted for readers using Community Edition.
