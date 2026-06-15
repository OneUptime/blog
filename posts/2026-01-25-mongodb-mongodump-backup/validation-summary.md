# Validation Summary: How to Implement Backup with mongodump in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB
- MongoDB Database Tools
- mongodump
- mongorestore
- bsondump
- Bash scripting
- cron
- AWS S3 CLI

## Sources Consulted
- MongoDB Database Tools: mongodump - https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Database Tools: mongorestore - https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Database Tools: mongorestore examples - https://www.mongodb.com/docs/database-tools/mongorestore/mongorestore-examples/
- MongoDB Database Tools: bsondump - https://www.mongodb.com/docs/database-tools/bsondump/
- MongoDB Ops Manager backup overview - https://www.mongodb.com/docs/ops-manager/current/core/backup-overview/

## Issues Found
- The description claimed the post covered incremental backups, but mongodump does not provide incremental backup behavior in the examples. Changed this to "consistent backups."
- The post described mongodump output as human-readable BSON/JSON. MongoDB documents mongodump output as BSON data files with JSON metadata, so the wording was corrected.
- The post said mongodump is portable across different MongoDB versions. MongoDB documents compatibility as the same major version or feature compatibility version, so this was changed to compatible deployments.
- The password-file example used unquoted command substitution for the password. Quoted it to avoid shell word splitting if the password contains special whitespace.
- The oplog examples were described as point-in-time backup/recovery. The shown commands create and restore a consistent dump using oplog entries from the dump window, so the headings and text were corrected.
- Added the documented `--oplog` limitation that it must be used for a full dump of a replica set member and fails with limiting options such as `--db`, `--collection`, or `--query`.
- Directory restore examples used `--db` to restore a database or rename a database. MongoDB now deprecates `--db` and `--collection` for directory or archive restores, so these examples were changed to `--nsInclude`, `--nsFrom`, and `--nsTo`.
- The duplicate-key example used `--noIndexRestore` and `--maintainInsertionOrder`, which do not skip duplicate key errors. The example was changed to document mongorestore's default continue-past-duplicate-key behavior.
- The backup script used `set -e` followed by a `$?` check after `mongodump`; with `set -e`, a failed command exits before the check. Changed the command to `if mongodump ...; then`.
- The verification script quoted a glob that would not expand and attempted to read a document count from mongodump metadata that does not contain counts. Changed it to restore with namespace remapping and count expected documents from the compressed BSON file using `gunzip` and `bsondump`.

## Review Notes
The single-collection restore example still uses `--db` and `--collection` with a `.bson` file, which is current according to MongoDB documentation. The password-file example works, but MongoDB's newer `--config` option is the recommended way to put sensitive values in a secured YAML file for Database Tools versions that support it.
