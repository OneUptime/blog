# Validation Summary: How to Implement Role-Based Access Control in Your App with MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (built-in RBAC: `createRole`, `createUser`, `getRole`, privilege actions)
- Node.js with Express.js
- MongoDB Node.js Driver (`mongodb` package)
- JSON Web Tokens (`jsonwebtoken` package)

## Sources Consulted
- MongoDB Manual: Privilege Actions — https://www.mongodb.com/docs/manual/reference/privilege-actions/
- MongoDB Manual: db.createRole() — https://www.mongodb.com/docs/manual/reference/method/db.createRole/
- MongoDB Manual: db.createUser() — https://www.mongodb.com/docs/manual/reference/method/db.createUser/
- MongoDB Manual: connectionStatus command — https://www.mongodb.com/docs/manual/reference/command/connectionStatus/
- MongoDB Manual: Resource Document — https://www.mongodb.com/docs/manual/reference/resource-document/
- MongoDB Node.js Driver API documentation
- Express.js routing documentation

## Issues Found

1. **`listCollections` action on collection-specific resource**: The `analyst` role granted the `listCollections` privilege action on `{ db: "myapp", collection: "orders" }`, which is a collection-specific resource. However, `listCollections` is a database-level action and must be granted on the database resource `{ db: "myapp", collection: "" }` (empty string for collection) to be effective. Moved `listCollections` to its own privilege entry with the correct database-level resource.

2. **`connectionStatus` missing `showPrivileges` option**: The command `db.runCommand({ connectionStatus: 1 })` was used with the comment "Check current user's privileges," but without `showPrivileges: true` it only returns authenticated users and their roles, not the individual privilege actions. Added `showPrivileges: true` to match the comment's intent.

## Review Notes
- The `rbacService` variable used in the `requirePermission` middleware is referenced but never shown being instantiated. This is a common tutorial pattern and is acceptable in context.
- The `db` variable in route handlers is similarly assumed to be available from an outer scope. Acceptable for a tutorial.
- `insertOne(req.body)` directly inserts user input without validation or sanitization. While not an error in the context of an RBAC tutorial, production code should validate input before inserting.
- The in-memory permission cache using `setTimeout` is a simple but functional approach. For production systems, a more robust caching solution (e.g., Redis with TTL) would be preferable, but the approach shown is correct for demonstration purposes.
