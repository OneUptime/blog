# Validation Summary: How to Rename a Collection in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (renameCollection command)
- mongosh (shell helpers)
- mongoexport / mongoimport (CLI tools)

## Sources Consulted
- MongoDB renameCollection command documentation: https://www.mongodb.com/docs/manual/reference/command/renameCollection/
- MongoDB db.collection.renameCollection() method documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.renameCollection/
- MongoDB 5.0 release notes (sharded collection rename support): https://www.mongodb.com/docs/manual/release-notes/5.0/

## Issues Found
1. **Sharded collections section was outdated.** The post stated that `renameCollection` does NOT work on sharded collections and that export/import is required. This was true for MongoDB 4.4 and earlier, but starting in MongoDB 5.0 (released July 2021), `renameCollection` supports same-database renames of sharded collections. Updated the section heading from "Sharded Collections - Not Supported" to "Sharded Collections", added the correct MongoDB 5.0+ behavior with an example, and clarified that the export/import workaround applies only to MongoDB 4.4 or earlier (or cross-database renames of sharded collections). Also updated the Summary section to reflect this change.

## Review Notes
- The `mongoexport` and `mongoimport` `--db` flag has been deprecated in newer MongoDB Database Tools versions in favor of specifying the database in the connection URI. The flag still works, so this is not an error, but authors may want to update examples to use connection string syntax in the future.
- The oplog window note in the replica set section is technically correct but somewhat overly cautious for a metadata-only rename operation, which generates a single small oplog entry. This is not an error.
