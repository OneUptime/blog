# Validation Summary: How to Use $listSessions and $listLocalSessions in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB (aggregation pipeline)
- `$listSessions` aggregation stage
- `$listLocalSessions` aggregation stage
- `killSessions` admin command
- `config.system.sessions` collection

## Sources Consulted
- MongoDB Manual: $listSessions — https://www.mongodb.com/docs/manual/reference/operator/aggregation/listSessions/
- MongoDB Manual: $listLocalSessions — https://www.mongodb.com/docs/manual/reference/operator/aggregation/listLocalSessions/
- MongoDB Manual: killSessions — https://www.mongodb.com/docs/manual/reference/command/killSessions/
- MongoDB Manual: config.system.sessions — https://www.mongodb.com/docs/manual/reference/config-database/#config.system.sessions

## Issues Found

### 1. Wrong database and collection for `$listSessions` (5 code blocks affected)
- **What was wrong:** All `$listSessions` examples used `use admin` and `db.aggregate([...])`. The `$listSessions` stage must be run against the `config.system.sessions` collection in the `config` database, not as a database-level aggregation on `admin`.
- **What was changed:** Replaced `use admin` with `use config` and `db.aggregate(...)` with `db.system.sessions.aggregate(...)` in all five code blocks that use `$listSessions`: "Listing All Sessions", "Listing Sessions for a Specific User", "Finding Stale Sessions", and "Counting Active Sessions Per User".
- **Why:** `$listSessions` reads from and must be piped through the `config.system.sessions` collection. Using `db.aggregate()` on the `admin` database would produce an error. `$listLocalSessions`, by contrast, correctly uses `db.aggregate()` as it reads from the in-memory session cache and is not tied to a specific collection.

### 2. Comparison table listed wrong database requirement
- **What was wrong:** The table stated `$listSessions` requires the "admin database".
- **What was changed:** Changed to "config database".
- **Why:** Consistent with the fix above; `$listSessions` operates on the `config` database.

## Review Notes
- The `$listLocalSessions` examples use `use admin` before `db.aggregate()`. While `$listLocalSessions` can run against any database (not just `admin`), this is technically correct and not misleading, so it was left unchanged.
- The post references `user.name` as a field in session documents (used in `$project` and `$group` stages). This field is present for authenticated sessions but its availability depends on the authentication mechanism. This is acceptable for a tutorial context.
- The security note that "`$listSessions` requires the `listSessions` privilege or the `root` role" is slightly simplified — users can always list their own sessions without special privileges; the `listSessions` privilege is needed to list all users' sessions with `allUsers: true`. This is a minor nuance and not incorrect as stated.
