# Validation Summary: How to Set Up a Replica Set with Analytics Node in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Replica Sets, Hidden Members, WiredTiger)
- mongosh (MongoDB Shell)
- PyMongo (Python MongoDB driver)

## Sources Consulted
- MongoDB documentation on replica set members: https://www.mongodb.com/docs/manual/core/replica-set-hidden-member/
- MongoDB documentation on rs.add(): https://www.mongodb.com/docs/manual/reference/method/rs.add/
- MongoDB documentation on secondaryDelaySecs: https://www.mongodb.com/docs/manual/core/replica-set-delayed-member/
- PyMongo Collection.aggregate() documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.aggregate
- MongoDB documentation on directConnection URI option: https://www.mongodb.com/docs/manual/reference/connection-string/#mongodb-urioption-urioption.directConnection

## Issues Found
1. **Incorrect PyMongo aggregate call**: The original code called `client["orders"].aggregate("sales", pipeline)`, which invokes `Database.aggregate()` with a collection name as the first argument. In PyMongo, `aggregate()` is a method on `Collection`, not `Database`. `Database.aggregate()` exists but is for database-level aggregation stages (e.g., `$currentOp`) and does not accept a collection name. Fixed to `client["orders"]["sales"].aggregate(pipeline)`, which correctly accesses the "sales" collection from the "orders" database and then runs the aggregation pipeline on it.

## Review Notes
- The post uses `secondaryDelaySecs` which is the modern field name (MongoDB 5.0+). The older `slaveDelay` field was deprecated. This is correct for current MongoDB versions.
- Arrow functions used in `findIndex` and `find` callbacks are valid in `mongosh` but not in the legacy `mongo` shell. Since `mongosh` is the current default shell, this is appropriate.
- The `use admin` line in the `db.createUser()` code block is a shell-specific command that wouldn't work in a `.js` script file, but is correct for interactive `mongosh` usage as shown.
- The `votes: 1` setting for the hidden member is the default and could be omitted, but including it explicitly is fine for clarity.
