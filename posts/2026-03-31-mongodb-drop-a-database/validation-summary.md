# Validation Summary: How to Drop a Database in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (mongosh shell, WiredTiger storage engine)
- MongoDB Replica Sets (write concern)
- MongoDB Atlas
- MongoDB Role-Based Access Control (RBAC)

## Sources Consulted
- MongoDB official documentation: `db.dropDatabase()` method — https://www.mongodb.com/docs/manual/reference/method/db.dropDatabase/
- MongoDB official documentation: `dropDatabase` command — https://www.mongodb.com/docs/manual/reference/command/dropDatabase/
- MongoDB official documentation: `compact` command — https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB official documentation: Security users — https://www.mongodb.com/docs/manual/core/security-users/
- MongoDB official documentation: Built-in roles — https://www.mongodb.com/docs/manual/reference/built-in-roles/
- MongoDB FAQ: Storage — https://www.mongodb.com/docs/manual/faq/storage/

## Issues Found

### Issue 1: Incorrect claim about user removal on dropDatabase
**What was wrong:** The post stated "Users and roles defined at the database level in MongoDB 2.x are removed" when the database is dropped. The official MongoDB documentation explicitly states: "This command does not delete the users associated with the current database." `dropDatabase` does not remove users in any MongoDB version.
**What was changed:** Replaced the incorrect claim with accurate information: users are NOT removed by `dropDatabase`, and `db.dropAllUsers()` must be run separately to remove them.

### Issue 2: Incorrect disk space reclamation explanation
**What was wrong:** The post claimed "After dropping a database, WiredTiger does not immediately return space to the OS" and suggested running `compact` on `system.users` in the admin database. This is incorrect on two counts: (1) When `dropDatabase` is executed, WiredTiger deletes the actual data files from the filesystem, and the OS reclaims that space — the "space not returned" behavior only applies to document deletion within collections, not dropping entire databases. (2) Running `compact` on `admin.system.users` after dropping a different database is logically unrelated and would not reclaim any space from the dropped database.
**What was changed:** Rewrote the section to accurately explain that dropDatabase deletes data files and the OS reclaims space, and clarified the distinction from document-level deletion behavior. Removed the incorrect `compact` example.

### Issue 3: Wrong code block language tag
**What was wrong:** The compact command example was in a code block tagged as `bash`, but contained mongosh commands (`use admin`, `db.runCommand(...)`), which are not bash commands.
**What was changed:** Removed as part of the disk space reclamation fix (Issue 2).

## Review Notes
- The `dropDatabase` privilege requirement section mentions only `dbAdmin` and `dbOwner` roles. While correct that these built-in roles include the `dropDatabase` action, custom roles can also grant this privilege. The current wording is acceptable for a tutorial but slightly oversimplified.
- The safety check script uses `db[coll].countDocuments()` which is correct for modern MongoDB but may be slow on very large collections since it performs a full collection scan. `estimatedDocumentCount()` would be faster for a safety check, though less precise.
- The authenticated `mongosh` example includes a plaintext password in the connection string. While acceptable for demonstration purposes, a production note about using `--username` and `--password` flags (which prompt for input) or environment variables would improve security guidance.
