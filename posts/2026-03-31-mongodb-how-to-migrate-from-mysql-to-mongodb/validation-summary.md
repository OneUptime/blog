# Validation Summary: How to Migrate from MySQL to MongoDB

## Status
validated

## Post Type
Tutorial / Step-by-step migration guide

## Technologies Covered
- MySQL (SQL, mysqldump, mysql client, JSON_OBJECT function, information_schema)
- MongoDB (document model, createIndex, $lookup aggregation, $unset, countDocuments)
- Python (pymysql, pymongo, bson)
- Node.js (mysql2 promise API, MongoDB Node.js driver)

## Sources Consulted
- MySQL 8.0 Reference Manual — mysqldump options: https://dev.mysql.com/doc/refman/8.0/en/mysqldump.html
- MySQL 8.0 Reference Manual — JSON_OBJECT function (introduced in 5.7.8): https://dev.mysql.com/doc/refman/8.0/en/json-creation-functions.html
- MySQL 8.0 Reference Manual — mysql client options (`-N` / `--skip-column-names`): https://dev.mysql.com/doc/refman/8.0/en/mysql-command-options.html
- MySQL 8.0 Reference Manual — SELECT INTO OUTFILE vs client-side redirection: https://dev.mysql.com/doc/refman/8.0/en/select-into.html
- MongoDB Manual — createIndex: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual — $lookup aggregation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/lookup/
- MongoDB Manual — $unset update operator: https://www.mongodb.com/docs/manual/reference/operator/update/unset/
- MongoDB Manual — countDocuments: https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/
- pymysql documentation: https://pymysql.readthedocs.io/
- pymongo documentation: https://pymongo.readthedocs.io/

## Issues Found

### 1. Misleading comment in Step 3 (Export Data from MySQL)
- **What was wrong:** The comment said "Or export to JSON using SELECT INTO OUTFILE" but the actual command used `mysql -e` with shell redirection (`>`). `SELECT INTO OUTFILE` is a server-side file write operation requiring FILE privilege, while `mysql -e` with redirection is a client-side operation — fundamentally different mechanisms.
- **What was changed:** Updated the comment to "Or export to JSON using the mysql client" to accurately describe the technique used.

### 2. Missing `--skip-column-names` flag in Step 3
- **What was wrong:** The `mysql -e` command would include a column header row in the output (e.g., the column name `JSON_OBJECT(...)`), resulting in a non-clean JSON file.
- **What was changed:** Added the `-N` flag (short for `--skip-column-names`) to suppress the header row and produce clean JSON output.

### 3. Duplicate user documents bug in Step 4 (Transform Data)
- **What was wrong:** The LEFT JOIN between `users` and `addresses` produces multiple rows per user when a user has multiple addresses (the schema allows 1:many). The script iterated over all rows without deduplication, causing: (a) multiple MongoDB documents inserted for the same user, (b) `id_map` overwritten with the last ObjectId per user, orphaning earlier duplicates, and (c) potential `DuplicateKeyError` if the email unique index was already created.
- **What was changed:** Added a check `if row["id"] in id_map: continue` at the start of the loop to skip duplicate rows from the JOIN, ensuring each user is migrated exactly once.

## Review Notes
- The `information_schema.tables.table_rows` column used in Step 1 returns an estimate for InnoDB tables, not an exact count. This is accurate behavior but worth noting — for precise counts, `SELECT COUNT(*) FROM table` is needed.
- The Python migration script inserts users one at a time (`insert_one` in a loop) while orders use `insert_many`. For large datasets, batching user inserts with `insert_many` would be significantly faster, but this is a performance optimization rather than a correctness issue.
- The `import datetime` in the Python script is unused. This is a minor style issue, not a technical error.
- The deduplication fix preserves only the first address for users with multiple addresses. In a production migration, you would likely want to embed all addresses as an array. However, the blog post's MongoDB schema design uses a single `address` object, so this is consistent with the stated design.
