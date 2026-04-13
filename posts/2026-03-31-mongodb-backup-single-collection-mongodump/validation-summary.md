# Validation Summary: How to Back Up a Single Collection with mongodump in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- mongodump (MongoDB Database Tools)
- mongorestore (MongoDB Database Tools)
- mongosh (MongoDB Shell)
- Bash scripting
- cron

## Sources Consulted
- MongoDB Database Tools documentation for mongodump: https://www.mongodb.com/docs/database-tools/mongodump/
- MongoDB Database Tools documentation for mongorestore: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB Extended JSON v2 specification: https://www.mongodb.com/docs/manual/reference/mongodb-extended-json/
- MongoDB Shell (mongosh) documentation for countDocuments: https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/

## Issues Found
No technical issues found.

## Review Notes
- The `--db` and `--collection` flags used with `mongorestore` are deprecated in MongoDB Database Tools 100.0.0+ in favor of `--nsInclude` and `--nsFrom`/`--nsTo` for namespace remapping. They still function correctly, and the post already demonstrates `--nsInclude` for archive restores. This is not an error but worth noting for future updates.
- The `--password` flag with a plaintext value on the command line is a security consideration (visible in process listings). The post uses this for simplicity, which is standard for tutorial content. Production use should prefer `--config` files or prompting for the password.
- The `--query` flag uses Extended JSON v2 relaxed format, which is correct for MongoDB Database Tools 100.0.0+. Older tool versions may require different JSON formatting.
