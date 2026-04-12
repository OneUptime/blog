# Validation Summary: How to Use db.getCollectionInfos() in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell method `db.getCollectionInfos()`)
- MongoDB `listCollections` command (underlying server command)
- Node.js MongoDB driver (`db.listCollections()`)
- PyMongo (`db.list_collections()`)
- JSON Schema validation in MongoDB

## Sources Consulted
- MongoDB official documentation: `db.getCollectionInfos()` shell method (https://www.mongodb.com/docs/manual/reference/method/db.getCollectionInfos/)
- MongoDB official documentation: `listCollections` command (https://www.mongodb.com/docs/manual/reference/command/listCollections/)
- MongoDB Node.js driver documentation: `Db.listCollections()` (https://mongodb.github.io/node-mongodb-native/)
- PyMongo documentation: `Database.list_collections()` (https://pymongo.readthedocs.io/en/stable/api/pymongo/database.html)

## Issues Found
- **Misleading variable name in "Compare Validation Rules Across Environments" section**: The variable was named `stageValidator` but was assigned from the `prod` object, making the code confusing. Renamed to `prodValidator` to accurately reflect that it holds the production validator being exported for comparison against staging.

## Review Notes
- The `options.max` property for capped collections is optional (only present if `max` was specified at creation time). The capped collection example accesses `c.options.max` which could print `undefined` if `max` was not set. This is not incorrect behavior but readers should be aware.
- The `use myapp;` line includes a semicolon which is atypical in mongosh for the `use` command, but causes no error.
- The Node.js example explicitly sets `nameOnly: false` which is the default value -- redundant but not incorrect, and serves as good documentation of intent.
