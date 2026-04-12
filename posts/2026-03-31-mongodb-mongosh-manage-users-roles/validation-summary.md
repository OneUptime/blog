# Validation Summary: How to Use mongosh to Manage Users and Roles in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongosh (MongoDB Shell)
- MongoDB Role-Based Access Control (RBAC)

## Sources Consulted
- MongoDB official documentation: db.createUser() — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB official documentation: db.updateUser() — https://www.mongodb.com/docs/manual/reference/method/db.updateUser/
- MongoDB official documentation: db.dropUser() — https://www.mongodb.com/docs/manual/reference/method/db.dropUser/
- MongoDB official documentation: db.getUsers() — https://www.mongodb.com/docs/manual/reference/method/db.getUsers/
- MongoDB official documentation: db.getUser() — https://www.mongodb.com/docs/manual/reference/method/db.getUser/
- MongoDB official documentation: db.grantRolesToUser() — https://www.mongodb.com/docs/manual/reference/method/db.grantRolesToUser/
- MongoDB official documentation: db.revokeRolesFromUser() — https://www.mongodb.com/docs/manual/reference/method/db.revokeRolesFromUser/
- MongoDB official documentation: db.createRole() — https://www.mongodb.com/docs/manual/reference/method/db.createRole/
- MongoDB official documentation: db.grantPrivilegesToRole() — https://www.mongodb.com/docs/manual/reference/method/db.grantPrivilegesToRole/
- MongoDB official documentation: db.revokePrivilegesFromRole() — https://www.mongodb.com/docs/manual/reference/method/db.revokePrivilegesFromRole/
- MongoDB official documentation: db.getRoles() — https://www.mongodb.com/docs/manual/reference/method/db.getRoles/
- MongoDB official documentation: db.getRole() — https://www.mongodb.com/docs/manual/reference/method/db.getRole/
- MongoDB official documentation: db.dropRole() — https://www.mongodb.com/docs/manual/reference/method/db.dropRole/
- MongoDB official documentation: Built-in Roles — https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB official documentation: Privilege Actions — https://www.mongodb.com/docs/manual/reference/privilege-actions/

## Issues Found
No technical issues found.

## Review Notes
- The use of `.pretty()` on `db.system.users.find()` is unnecessary in mongosh since it automatically pretty-prints cursor output. However, mongosh retains `.pretty()` for backward compatibility with the legacy mongo shell, so it still works without error.
- The post could mention `db.changeUserPassword()` as a more purpose-specific alternative to `db.updateUser()` for password changes, but using `db.updateUser()` with `pwd` is equally valid.
- All privilege actions used (`find`, `insert`, `update`) are valid MongoDB privilege actions per the official documentation.
