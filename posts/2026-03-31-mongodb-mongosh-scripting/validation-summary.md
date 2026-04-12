# Validation Summary: How to Write Scripts with mongosh for Automation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongosh (MongoDB Shell)
- JavaScript (ES6+)
- Bash / cron scheduling
- Node.js process.env

## Sources Consulted
- MongoDB mongosh documentation: https://www.mongodb.com/docs/mongodb-shell/
- mongosh scripting reference: https://www.mongodb.com/docs/mongodb-shell/write-scripts/
- mongosh CLI options: https://www.mongodb.com/docs/mongodb-shell/reference/options/
- mongosh configuration: https://www.mongodb.com/docs/mongodb-shell/reference/configure-shell-settings/
- MongoDB transactions documentation: https://www.mongodb.com/docs/manual/core/transactions/
- MongoDB index error codes: https://www.mongodb.com/docs/manual/reference/error-codes/
- ECMAScript specification (const/let temporal dead zone): https://tc39.es/ecma262/

## Issues Found

1. **`print()` and `quit()` incorrectly described as "Node.js globals"** — These are mongosh shell helpers, not Node.js globals. Node.js uses `console.log()` for printing. Changed "Node.js globals" to "shell helpers".

2. **`--config` CLI flag does not exist in mongosh** — The post showed `mongosh --config /etc/mongosh/config.yml` and a config file with a `connectionString` field. mongosh has no `--config` CLI option, and its configuration file (`~/.mongodb/mongosh/config`) only controls shell settings (editor, telemetry, etc.), not connection parameters. Replaced the entire section with the correct approach: using a shell environment variable (`export MONGODB_URI=...`) and passing it to mongosh on the command line.

3. **`const db = db.getSiblingDB(...)` causes ReferenceError due to Temporal Dead Zone** — This pattern appeared in 6 code examples. JavaScript's `const` declaration creates a lexical binding that shadows the global `db` before initialization, causing a `ReferenceError: Cannot access 'db' before initialization`. MongoDB's own documentation uses `db = db.getSiblingDB(...)` (bare assignment without `const`). Fixed all 6 instances by removing the `const` keyword.

4. **Unused `uri` variable in env-aware-script.js** — The script read `process.env.MONGODB_URI` into a `uri` variable but never used it to establish a connection. The accompanying run command also didn't pass the URI to mongosh. Removed the unused variable and fixed the run command to pass the connection string directly to mongosh on the command line (`mongosh "$MONGODB_URI" --file ...`).

## Review Notes
- The transaction example (safe-migration.js) uses `session.getDatabase()` which is correct for mongosh but requires a replica set deployment. The post doesn't mention this prerequisite. A future revision could add a note about this.
- The `adminDb.system.users.findOne()` approach for checking user existence works but requires read access to the `admin.system.users` collection. The `db.getUser()` helper method is an alternative that may be more reliable in environments with restricted access.
- Error codes 85 (IndexOptionsConflict) and 86 (IndexKeySpecsConflict) in the index management script are correct.
- The cron example correctly redirects both stdout and stderr to a log file.
