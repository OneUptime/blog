# Validation Summary: How to Verify Backup Consistency for MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (mongod, mongosh, mongorestore)
- MongoDB Database Tools (mongorestore --dryRun)
- gzip (archive integrity verification)
- Bash scripting (automation pipeline)

## Sources Consulted
- [MongoDB validate command documentation (v7.0)](https://www.mongodb.com/docs/v7.0/reference/command/validate/)
- [MongoDB validate command documentation (latest)](https://www.mongodb.com/docs/manual/reference/command/validate/)
- [db.collection.validate() mongosh method](https://www.mongodb.com/docs/manual/reference/method/db.collection.validate/)
- [mongorestore documentation](https://www.mongodb.com/docs/database-tools/mongorestore/)
- MongoDB Database Tools CLI reference for --dryRun, --gzip, --archive flags

## Issues Found
1. **Incorrect comment in Step 1 (line 26):** The comment said "For uncompressed archives, check with mongodump's built-in verification" but the command uses `--gzip` on a `.gz` file (a compressed archive) and invokes `mongorestore`, not `mongodump`. Fixed to: "Verify the archive with mongorestore's dry run mode".
2. **Non-existent output field in Step 3 (line 81):** The validate script referenced `result.nrecords` to display document counts, but `nrecords` is not a documented output field of `db.collection.validate()` in current MongoDB versions. Replaced with `testDb.getCollection(collName).estimatedDocumentCount()` which is the correct way to retrieve a collection's document count.

## Review Notes
- The `--dryRun` flag for `mongorestore` is confirmed valid in current MongoDB Database Tools. It parses and validates the archive without writing data.
- The `validate({full: true})` syntax and its `valid`/`errors` output fields are correct for current MongoDB versions.
- The `countDocuments()` calls in Step 4 are correct but may be slow on very large collections; the post could mention `estimatedDocumentCount()` as a faster alternative, though this is a minor optimization concern and not an error.
- The `db.adminCommand({shutdown:1})` cleanup command in Step 5 is correct.
- The overall approach (gzip -t, dry run restore, validate, count comparison, automation) is sound and follows MongoDB best practices.
