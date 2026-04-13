# Validation Summary: How to Use Built-In Roles in MongoDB (read, readWrite, dbAdmin)

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (built-in roles, authorization, access control)
- mongosh (MongoDB Shell)

## Sources Consulted
- [MongoDB Built-In Roles Documentation](https://www.mongodb.com/docs/manual/reference/built-in-roles/)
- [MongoDB db.createUser() Reference](https://www.mongodb.com/docs/manual/reference/method/db.createUser/)
- [MongoDB db.getUser() Reference](https://www.mongodb.com/docs/manual/reference/method/db.getUser/)
- [MongoDB db.grantRolesToUser() Reference](https://www.mongodb.com/docs/manual/reference/method/db.grantRolesToUser/)
- [MongoDB db.revokeRolesFromUser() Reference](https://www.mongodb.com/docs/manual/reference/method/db.revokeRolesFromUser/)
- [MongoDB Privilege Actions Reference](https://www.mongodb.com/docs/manual/reference/privilege-actions/)

## Issues Found

1. **Incorrect database context for `db.getUser()`**: The "View a User's Roles" section used `use admin` before calling `db.getUser("appservice")`, but the "appservice" user was created on the `myapp` database. `db.getUser()` looks up users in the current database, so this would fail to find the user. Fixed by changing `use admin` to `use myapp`.

2. **Misleading summary recommendation**: The summary stated "use `userAdmin` rather than `root` for database administration tasks." The `userAdmin` role only grants user and role management privileges — it cannot read data, write data, or manage schemas. For database administration tasks, `dbAdmin` is the appropriate role. Fixed to "use specific roles like `dbAdmin` rather than `root` for database administration tasks."

## Review Notes
- The `db.createUser()` examples use plaintext passwords. MongoDB best practice recommends using `passwordPrompt()` for interactive use to avoid exposing passwords in shell history. This is not a technical error but a security best practice the reader should be aware of.
- The role privilege descriptions in the tables are high-level summaries. The actual privilege sets are more detailed (e.g., `read` grants 9 actions including `changeStream`, `dbHash`, `killCursors`; `readAnyDatabase` excludes `local` and `config` databases). This level of detail is appropriate for an overview blog post.
- All `db.createUser()`, `db.grantRolesToUser()`, and `db.revokeRolesFromUser()` syntax is correct for current MongoDB versions (7.x/8.x).
