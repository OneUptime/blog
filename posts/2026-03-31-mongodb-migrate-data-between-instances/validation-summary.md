# Validation Summary: How to Migrate Data Between MongoDB Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongodump, mongorestore)
- MongoDB connection string URI format
- MongoDB replica sets
- MongoDB shell (mongosh) commands (countDocuments, dbHash)
- mongomirror (mentioned)
- MongoDB change streams (mentioned)

## Sources Consulted
- MongoDB mongodump documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB dbHash command reference: https://www.mongodb.com/docs/manual/reference/command/dbHash/
- MongoDB countDocuments method: https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/

## Issues Found
No technical issues found.

## Review Notes
- The `--db` and `--collection` flags used with `mongorestore` in the "Migrating a Single Database" and "Migrating a Single Collection" sections are deprecated as of MongoDB 4.4 when restoring from a directory or BSON file. They still function correctly but may be removed in a future release. The modern alternative is `--nsInclude`. Since the post does not target a specific MongoDB version and the flags remain functional, this is not an error but worth noting for future updates.
- The `--nsFrom` and `--nsTo` flags in the piping example are not strictly necessary when the source and destination namespaces are identical, but including them is not incorrect and demonstrates the remapping capability.
- The replica set restore example includes a database name (`/mydb`) in the `--uri`. For `mongorestore`, the database component in the URI serves as the authentication database context, not the target database. The actual target database is determined by the dump directory structure. This works correctly but could be mildly confusing to readers.
