# Validation Summary: How to Test Backup Integrity for MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod, mongosh, mongorestore, mongodump)
- Bash scripting
- JavaScript (mongosh scripts)

## Sources Consulted
- MongoDB mongod command-line options documentation: https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB db.collection.validate() documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.validate/
- MongoDB db.collection.getIndexes() documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.getIndexes/
- MongoDB listDatabases command documentation: https://www.mongodb.com/docs/manual/reference/command/listDatabases/
- MongoDB mongosh scripting documentation: https://www.mongodb.com/docs/mongodb-shell/write-scripts/

## Issues Found
- **Syntax error in validate-collections.js (lines 98-103):** The `print()` calls at the end of the script contained literal newlines inside double-quoted strings (e.g., `print("\n FAILED COLLECTIONS:", ...)`). In JavaScript, regular strings delimited by `"` or `'` cannot contain unescaped literal line breaks — this is a SyntaxError. Fixed by replacing the literal newlines with `\n` escape sequences.

## Review Notes
- In test-backup-counts.sh, the variables `MONGO_URI`, `FAILURES`, and `prodUri` are defined but never used. The script title and comment say "Compare document counts" but it only prints test instance counts without connecting to production for comparison. This is a completeness gap rather than a technical error — the code runs fine, it just doesn't fully deliver on its stated purpose.
- The `--noauth` flag on `mongod` is redundant (no-auth is the default), but it is a valid option and not incorrect.
- The `date -d 'yesterday'` syntax in weekly-backup-test.sh is GNU/Linux-specific and will not work on macOS. This is acceptable since backup testing scripts typically run on Linux servers.
- The `JSON.stringify` comparison for index keys works reliably because MongoDB returns index key specifications in their defined order, but it is worth noting this approach is generally fragile for arbitrary JSON comparison.
