# Validation Summary: How to Migrate from MySQL to MongoDB with mongoimport

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongoimport, mongosh, indexes)
- MySQL (mysql client, JSON_OBJECT, INTO OUTFILE, information_schema)
- Python (mysql.connector, json module)
- Bash (shell commands, piping)

## Sources Consulted
- MySQL `INTO OUTFILE` syntax: https://dev.mysql.com/doc/refman/8.0/en/select-into.html
- MySQL `--batch` output format (tab-separated): https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html#option_mysql_batch
- MySQL `JSON_OBJECT` function (available since 5.7.22): https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html#function_json-object
- MongoDB `mongoimport` documentation (`--jsonArray`, `--type tsv/csv`, `--headerline`): https://www.mongodb.com/docs/database-tools/mongoimport/
- MongoDB `createIndex` documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MySQL `information_schema.tables` `table_rows` column (approximate for InnoDB): https://dev.mysql.com/doc/refman/8.0/en/information-schema-tables-table.html
- mongosh global `db` variable behavior: https://www.mongodb.com/docs/mongodb-shell/reference/methods/

## Issues Found

1. **Misleading comment on JSON export (Step 2)**: The comment said "Using mysqldump with JSON mode (MySQL 8.0+)" but the command uses the `mysql` client with `JSON_OBJECT()`, not `mysqldump`. Also, `JSON_OBJECT` has been available since MySQL 5.7.22, not 8.0. Fixed to "Using JSON_OBJECT function (MySQL 5.7.22+)".

2. **TSV/CSV mismatch (Steps 1 and 4)**: The `mysql --batch --silent` command produces tab-separated output, but the file was named `users_with_headers.csv` and the mongoimport command used `--type csv`. This would cause incorrect parsing since the actual delimiter is a tab, not a comma. Fixed by renaming the file to `.tsv` and changing mongoimport to `--type tsv`.

3. **Incorrect mongoimport description (Step 4)**: The first mongoimport example was described as "Import a JSON Lines file (one document per line)" but used `--jsonArray`, which is for files containing a single JSON array (`[{...}, {...}]`), not JSON Lines format. Fixed the description to "Import a JSON array file (all documents wrapped in a single array)."

4. **`const db` in mongosh (Steps 5 and 6)**: Used `const db = db.getSiblingDB("myapp")` which attempts to redeclare the global `db` variable with `const`. In mongosh's REPL, `db` is already a global variable; using `const` to shadow it is unconventional and will error if the snippet is run more than once in the same session. Fixed to `db = db.getSiblingDB("myapp")`.

5. **Approximate row counts not noted (Step 6)**: The MySQL validation query uses `table_rows` from `information_schema.tables`, which returns approximate counts for InnoDB tables. For migration validation where exact counts matter, this could be misleading. Added a clarifying comment noting the approximation and suggesting `COUNT(*)` for exact counts.

## Review Notes
- The Python scripts use `value.isoformat() + "Z"` which unconditionally appends a UTC timezone suffix. This is only correct if the MySQL server stores times in UTC. For servers using local time zones, this would produce incorrect timestamps. This is acceptable for a tutorial but worth noting.
- The Python export script does not handle `Decimal` types from MySQL, which would cause `json.dumps()` to raise a `TypeError`. The denormalization script handles this correctly with `float()` conversion but the simple export script in Step 2 does not. This is acceptable since the example queries a `users` table unlikely to have DECIMAL columns.
- `cursor.rowcount` after iterating an unbuffered `MySQLCursorDict` should be correct after full iteration, but buffered cursors would be more reliable for this use case.
