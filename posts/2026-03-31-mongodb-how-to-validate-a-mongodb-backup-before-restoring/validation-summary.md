# Validation Summary: How to Validate a MongoDB Backup Before Restoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongod, mongosh, mongorestore, mongodump)
- MongoDB Database Tools (bsondump, mongorestore)
- Bash scripting
- BSON file format

## Sources Consulted
- MongoDB bsondump documentation: https://www.mongodb.com/docs/database-tools/bsondump/
- MongoDB mongorestore documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB db.collection.validate() documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.validate/
- MongoDB db.collection.reIndex() documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.reIndex/
- MongoDB mongod options documentation: https://www.mongodb.com/docs/manual/reference/program/mongod/

## Issues Found

1. **Incorrect bsondump output claim (lines 44-45)**: The post claimed that `bsondump` outputs a JSON summary line `{"summary": {"seen": 12345, "valid": 12345}}` as the last line of stdout. This is incorrect — `bsondump` outputs Extended JSON documents to stdout and does not produce a summary line. Fixed to use the exit code for validation instead (exit code 0 = valid BSON, non-zero = corrupt).

2. **Unreliable bsondump validation loop (lines 48-55)**: The original loop grepped for `"valid"` in bsondump's stdout, which would match any document containing a field named "valid" rather than indicating file integrity. Also used `**/*.bson` glob which requires `shopt -s globstar` in bash. Fixed to check the exit code of bsondump and use `find` instead of globstar for portability.

3. **Deprecated `db.orders.reIndex()` (line 129)**: `reIndex()` has been deprecated since MongoDB 6.0. Replaced with the recommended approach of dropping and recreating indexes individually, with a note about the deprecation.

4. **Unnecessary `--noauth` flag (line 164)**: The `--noauth` flag in the automated validation script is unnecessary — mongod runs without authentication by default when no auth configuration is provided. Removed to avoid confusion.

## Review Notes
- The `mongorestore --dryRun` approach for counting backup documents is version-dependent in its exact output format. The grep pattern `"would restore"` may need adjustment depending on the MongoDB Database Tools version.
- The hardcoded credentials in the production comparison example (`mongodb://admin:secret@localhost:27017`) are clearly placeholder values, which is fine for a tutorial, but a note about using environment variables or a credentials file would be a nice addition.
- The `db.collection.validate({ full: true })` usage is correct and well-demonstrated. The `full: true` option performs a more thorough validation including index structure checks.
