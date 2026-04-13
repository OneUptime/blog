# Validation Summary: How to Use the listDatabases and listCollections Commands in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (server commands: `listDatabases`, `listCollections`, `collStats`)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB `listDatabases` command documentation: https://www.mongodb.com/docs/manual/reference/command/listDatabases/
- MongoDB `listCollections` command documentation: https://www.mongodb.com/docs/manual/reference/command/listCollections/
- MongoDB `collStats` command documentation: https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB `db.adminCommand()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.adminCommand/
- MongoDB `db.getCollectionNames()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.getCollectionNames/
- MongoDB `db.getSiblingDB()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.getSiblingDB/

## Issues Found
No technical issues found.

## Review Notes
- The `collStats` command was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The code in the "Iterating All Databases and Collections" section still works but users on MongoDB 6.2+ may see deprecation warnings. This is not an error in the post but worth noting for future updates.
- The example output `totalSize: 12329000` does not exactly equal the sum of the three shown databases (40960 + 4096000 + 8192000 = 12328960), but this is acceptable as illustrative sample output.
- The variable name `cursor` in the "Getting Collection Options" section could be slightly confusing since the result object's field is also named `cursor` (leading to `cursor.cursor.firstBatch`), but this is technically correct and a matter of style rather than correctness.
