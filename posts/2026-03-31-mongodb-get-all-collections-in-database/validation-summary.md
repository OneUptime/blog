# Validation Summary: How to Get All Collections in a MongoDB Database

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (mongosh shell methods)
- MongoDB `listCollections` command
- MongoDB Node.js Driver (`mongodb` npm package)
- Python PyMongo driver

## Sources Consulted
- MongoDB `listCollections` command documentation: https://www.mongodb.com/docs/manual/reference/command/listCollections/
- MongoDB mongosh `db.getCollectionNames()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.getCollectionNames/
- MongoDB mongosh `db.getCollectionInfos()` documentation: https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/
- MongoDB Node.js Driver `Db.listCollections()` documentation: https://mongodb.github.io/node-mongodb-native/6.0/classes/Db.html#listCollections
- PyMongo `Database.list_collection_names()` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/database.html#pymongo.database.Database.list_collection_names
- PyMongo `Database.list_collections()` documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/database.html#pymongo.database.Database.list_collections
- MongoDB `collStats` command documentation: https://www.mongodb.com/docs/manual/reference/command/collStats/

## Issues Found
No technical issues found.

## Review Notes
- The `collStats` command used in the "Inspect Collection Stats" section was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The code still functions correctly, but users on MongoDB 6.2+ may see deprecation warnings. This is not an error in the post but worth noting for a future update.
- The `enxcol_.` prefix filter in the "Filter Out System and Internal Collections" section is correct -- this prefix is used by MongoDB's Queryable Encryption feature for internal collections.
- All shell examples use `mongosh`-compatible syntax (template literals, `const`, arrow functions), which is appropriate for modern MongoDB usage.
