# Validation Summary: How to Create Users and Assign Roles in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell commands and user management)
- MongoDB Role-Based Access Control (RBAC)
- mongosh / mongo shell

## Sources Consulted
- MongoDB documentation: db.createUser() — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB documentation: Built-In Roles — https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB documentation: db.createRole() — https://www.mongodb.com/docs/manual/reference/method/db.createRole/
- MongoDB documentation: Privilege Actions — https://www.mongodb.com/docs/manual/reference/privilege-actions/
- MongoDB documentation: db.grantRolesToUser() — https://www.mongodb.com/docs/manual/reference/method/db.grantRolesToUser/
- MongoDB documentation: db.revokeRolesFromUser() — https://www.mongodb.com/docs/manual/reference/method/db.revokeRolesFromUser/
- MongoDB documentation: db.changeUserPassword() — https://www.mongodb.com/docs/manual/reference/method/db.changeUserPassword/
- MongoDB documentation: db.getUsers() — https://www.mongodb.com/docs/manual/reference/method/db.getUsers/
- MongoDB documentation: passwordPrompt() — https://www.mongodb.com/docs/manual/reference/method/passwordPrompt/

## Issues Found
No technical issues found.

## Review Notes
- `passwordPrompt()` was introduced in MongoDB 4.2. The post does not specify a minimum version, but this is a reasonable omission since 4.2+ is well established.
- All built-in role names are current and not deprecated.
- The shorthand string syntax for roles (used in the admin user example) correctly applies roles to the current database (`admin`), which is the required database for `*AnyDatabase` roles.
- The custom role example correctly demonstrates collection-level privilege granularity with the `find` action.
- All user management methods (`db.getUsers()`, `db.changeUserPassword()`, `db.grantRolesToUser()`, `db.revokeRolesFromUser()`) use correct signatures.
