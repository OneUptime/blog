# Validation Summary: How to Use MongoDB with AWS DocumentDB

## Status
validated

## Post Type
Tutorial / Integration Guide

## Technologies Covered
- AWS DocumentDB
- MongoDB
- MongoDB Node.js Driver
- PyMongo (Python MongoDB driver)
- mongosh (MongoDB Shell)
- mongodump / mongorestore (MongoDB Database Tools)
- AWS Database Migration Service (DMS)
- DocumentDB Elastic Clusters

## Sources Consulted
- AWS DocumentDB compatibility documentation: https://docs.aws.amazon.com/documentdb/latest/developerguide/compatibility.html
- AWS DocumentDB supported MongoDB APIs: https://docs.aws.amazon.com/documentdb/latest/developerguide/mongo-apis.html
- AWS DocumentDB functional differences from MongoDB: https://docs.aws.amazon.com/documentdb/latest/developerguide/functional-differences.html
- AWS DocumentDB connecting programmatically: https://docs.aws.amazon.com/documentdb/latest/developerguide/connect_programmatically.html
- AWS DocumentDB change streams: https://docs.aws.amazon.com/documentdb/latest/developerguide/change_streams.html
- AWS DocumentDB dump/restore documentation: https://docs.aws.amazon.com/documentdb/latest/developerguide/backup_restore-dump_restore_import_export_data.html

## Issues Found

1. **Outdated MongoDB API version claim**: The post stated DocumentDB only implements the MongoDB 4.0 API. DocumentDB now supports MongoDB 3.6, 4.0, and 5.0 API compatibility (with 5.0 as the default for new clusters). Updated all references throughout the post.

2. **Incorrect change streams scope**: The post claimed change streams are "limited to cluster-level." DocumentDB supports change streams at collection, database, and cluster level. Corrected the description.

3. **Contradictory mongodump/mongorestore claim**: The "NOT SUPPORTED" section listed "mongodump/mongorestore with --uri flag" as unsupported, but the migration section demonstrated exactly that usage. mongodump and mongorestore do work with DocumentDB. Removed the incorrect claim.

4. **Unused Node.js code**: The `fs` module was imported and `global-bundle.pem` was read into a `ca` variable, but neither was used — the code correctly used `tlsCAFile` (a file path string) instead. Removed the unused `fs` import and `ca` variable.

5. **Unused Python import**: `import ssl` was present but never used. Modern PyMongo uses `tls=True` and `tlsCAFile` parameters directly. Removed the unused import.

6. **Redundant and deprecated TLS flags in mongorestore**: The command specified TLS both in the `--uri` query parameters and via separate `--ssl --sslCAFile` flags, which was redundant. Additionally, `--ssl` and `--sslCAFile` are deprecated in favor of `--tls` and `--tlsCAFile`. Rewrote the command to use `--host`, `--username`, `--password` with `--tls --tlsCAFile` flags, matching the pattern recommended in AWS documentation.

## Review Notes
- DocumentDB 8.0 compatibility was announced in November 2025 but is not yet widely documented as generally available. The post focuses on 5.0 which is the current LTS and default version, so no mention of 8.0 was added.
- The `$setWindowFields` operator remains unsupported even with DocumentDB 5.0 compatibility, despite being a MongoDB 5.0 feature. The post correctly lists it as unsupported.
- The `await client.connect()` in the Node.js example is at the top level, which requires Node.js top-level await support (ES modules). This is a common pattern in blog posts and is not incorrect, but readers using CommonJS modules would need to wrap it in an async function.
- The "Choose MongoDB Atlas when: MongoDB 5.x+ features" guidance remains accurate because DocumentDB 5.0 does not support all MongoDB 5.0 features (e.g., time series collections, window functions).
