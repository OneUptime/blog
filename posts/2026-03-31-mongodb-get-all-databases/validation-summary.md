# Validation Summary: How to Get All Databases in MongoDB

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- MongoDB (shell commands, admin commands)
- mongosh (MongoDB Shell)
- Node.js MongoDB official driver
- Python PyMongo driver

## Sources Consulted
- MongoDB `listDatabases` command documentation: https://www.mongodb.com/docs/manual/reference/command/listDatabases/
- MongoDB `show dbs` shell helper documentation: https://www.mongodb.com/docs/mongodb-shell/reference/access-mdb-shell-help/
- PyMongo `list_database_names()` API documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html
- Node.js MongoDB driver `Db.command()` documentation: https://mongodb.github.io/node-mongodb-native/

## Issues Found
No technical issues found.

## Review Notes
- The Node.js example uses `client.db("admin").command()` to run `listDatabases`. The driver also provides a more idiomatic `client.db().admin().listDatabases()` method, but the approach shown is correct and works as described.
- The `await client.connect()` call in the Node.js example is explicit. In MongoDB Node.js driver v4.0+, auto-connect on first operation makes this optional, but including it is still valid and a common practice.
- All APIs used (`list_database_names()` in PyMongo, `nameOnly`/`filter` options in `listDatabases`) are current and non-deprecated as of MongoDB 7.x / 8.x.
