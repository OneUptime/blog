# Validation Summary: How to Use mongorestore to Restore a MongoDB Backup

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongorestore (MongoDB Database Tools)
- mongodump (referenced as the backup companion)
- mongosh (for verification script)

## Sources Consulted
- MongoDB mongorestore official documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB mongodump official documentation: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB countDocuments() documentation: https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/
- MongoDB Database Tools release notes (deprecation of --db/--collection flags)

## Issues Found
No technical issues found.

## Review Notes
- The `--db` and `--collection` flags used in the "Restore a Single Database" and "Restore a Single Collection" sections have been deprecated since MongoDB Database Tools 100.0.0 (shipped with MongoDB 4.4). The recommended alternative is `--nsInclude` (e.g., `--nsInclude "myapp.*"`). However, these flags still function and remain widely used in documentation and tutorials, so this is not an error but something to be aware of for future updates.
- The verification script uses `db[col].countDocuments()` without an explicit filter argument. This works in mongosh where the filter defaults to `{}`, but would require an explicit `{}` argument in the legacy mongo shell. Since mongosh is the current default shell, this is correct.
- The post covers a good range of common restore scenarios: full restore, single database, single collection, compressed archives, namespace remapping, and parallel restores.
