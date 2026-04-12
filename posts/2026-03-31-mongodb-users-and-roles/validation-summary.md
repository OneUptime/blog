# Validation Summary: How to Create Users and Roles in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (role-based access control, user management, custom roles)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB Manual: Built-in Roles — https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB Manual: db.createUser() — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB Manual: db.createRole() — https://www.mongodb.com/docs/manual/reference/method/db.createRole/
- MongoDB Manual: Privilege Actions — https://www.mongodb.com/docs/manual/reference/privilege-actions/
- MongoDB Manual: User-Defined Roles — https://www.mongodb.com/docs/manual/core/security-user-defined-role/
- MongoDB Manual: Authentication Restrictions — https://www.mongodb.com/docs/manual/reference/method/db.createUser/#authentication-restrictions

## Issues Found
1. **Incorrect claim about where custom roles are stored**: The post stated "Custom roles are stored in the `admin` database but can be granted on specific databases." This is inaccurate. Custom roles are stored in the database where `db.createRole()` is executed. The `admin` database is only required when a role needs privileges spanning multiple databases. Fixed to: "Custom roles are stored in the database where you create them. Create roles in the `admin` database when they need privileges across multiple databases."

2. **Description/code mismatch for `orderWriter` role**: The text said the role "allows only inserting and finding documents" but the code included `"update"` in the actions array alongside `"find"` and `"insert"`. Fixed the description to: "allows finding, inserting, and updating documents."

## Review Notes
- All MongoDB shell methods (`db.createUser()`, `db.getUsers()`, `db.grantRolesToUser()`, `db.revokeRolesFromUser()`, `db.updateUser()`, `db.changeUserPassword()`, `db.dropUser()`, `db.createRole()`, `db.getRoles()`, `db.dropRole()`) are correct and current.
- The `passwordPrompt()` function is the recommended approach for interactive password entry in mongosh.
- Built-in role descriptions are accurate and complete for the most commonly used roles.
- The privilege actions listed in the reference table are all valid MongoDB privilege actions.
- The `authenticationRestrictions` syntax with `clientSource` and `serverAddress` is correct.
- The `db.getRoles()` call specifies `showBuiltinRoles: false` which is the default value — technically redundant but makes intent explicit, which is fine for a tutorial.
