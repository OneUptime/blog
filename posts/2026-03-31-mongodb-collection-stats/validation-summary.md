# Validation Summary: How to Use db.collection.stats() in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (shell method `db.collection.stats()`)
- WiredTiger storage engine (indexDetails option)
- mongosh (JavaScript scripting examples)

## Sources Consulted
- MongoDB official documentation for `db.collection.stats()`: https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB official documentation for `collStats` command: https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB official documentation for `$collStats` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/collStats/

## Issues Found
No technical issues found.

## Review Notes
- `db.collection.stats()` was deprecated starting in MongoDB 6.2. The recommended replacement is the `$collStats` aggregation stage. The method still functions in current MongoDB versions, and all information in the post is technically accurate, but readers using MongoDB 6.2+ may see deprecation warnings. A future update could mention this deprecation and show the `$collStats` equivalent.
- The output example is a simplified representation showing key fields only. The actual output from `db.collection.stats()` includes additional fields (e.g., `wiredTiger` sub-document, `scaleFactor`, `ok`). The post correctly qualifies this with "Key fields include" so this is not an error.
- The script examples use `const` and template literals, which require mongosh (the modern MongoDB shell) rather than the legacy `mongo` shell. This is appropriate as mongosh is the current default shell.
