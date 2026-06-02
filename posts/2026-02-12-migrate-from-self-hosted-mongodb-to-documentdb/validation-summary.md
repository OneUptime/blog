# Validation Summary: How to Migrate from Self-Hosted MongoDB to DocumentDB

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon DocumentDB
- MongoDB
- AWS Database Migration Service (AWS DMS)
- Boto3 / AWS SDK for Python
- PyMongo
- MongoDB Database Tools (`mongodump`, `mongorestore`)
- CloudWatch alarms

## Sources Consulted
- Amazon DocumentDB compatibility with MongoDB: https://docs.aws.amazon.com/documentdb/latest/devguide/compatibility.html
- Supported MongoDB APIs, operations, and data types in Amazon DocumentDB: https://docs.aws.amazon.com/documentdb/latest/devguide/mongo-apis.html
- Amazon DocumentDB quotas and limits: https://docs.aws.amazon.com/documentdb/latest/devguide/limits.html
- Connecting programmatically to Amazon DocumentDB: https://docs.aws.amazon.com/documentdb/latest/devguide/connect_programmatically.html
- Performing text search with Amazon DocumentDB: https://docs.aws.amazon.com/documentdb/latest/devguide/text-search.html
- Monitoring Amazon DocumentDB with CloudWatch: https://docs.aws.amazon.com/documentdb/latest/devguide/cloud_watch.html
- Using MongoDB as a source for AWS DMS: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MongoDB.html
- Using Amazon DocumentDB as a target for AWS DMS: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DocumentDB.html
- Boto3 DMS `create_endpoint` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dms/client/create_endpoint.html
- MongoDB Database Tools `mongorestore` reference: https://www.mongodb.com/docs/database-tools/mongorestore/
- MongoDB change streams documentation: https://www.mongodb.com/docs/manual/changestreams/
- MongoDB change stream update event documentation: https://www.mongodb.com/docs/current/reference/change-events/update/
- PyMongo update documentation: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/crud/update/

## Issues Found
- DocumentDB compatibility was outdated. The post listed only MongoDB 3.6, 4.0, and 5.0 compatibility; current Amazon DocumentDB documentation also lists 8.0 API compatibility. Updated the compatibility statement.
- The post said full-text search was unsupported and should use OpenSearch. Amazon DocumentDB now supports native text search with documented limitations, so the unsupported-feature bullet was changed to note differences and limitations instead.
- The post listed GridFS as unsupported. Amazon DocumentDB's supported API table lists GridFS support for instance-based 3.6, 4.0, 5.0, and 8.0 clusters, so the unsupported GridFS bullet was removed.
- The DMS source endpoint example used table-mode nesting (`NestingLevel: one`) while migrating to DocumentDB. AWS DMS documentation says MongoDB-to-DocumentDB migrations should run in Document mode, so the example now uses `NestingLevel: none` and keeps `_id` extraction for CDC.
- The DMS endpoint settings were split between top-level fields and engine-specific settings. Updated the example to use `MongoDbSettings` and `DocDbSettings` fields documented by the Boto3 API reference.
- The custom change stream replication example opened the change stream after the full copy, which could miss writes during the copy. The stream is now opened before the copy.
- The custom change stream update handler passed `updateDescription` directly to `update_one()`, but PyMongo expects update operators such as `$set` and `$unset`. Updated the code to transform `updatedFields` and `removedFields` into a valid update document.
- The custom replication example did not handle replace events. Added `replace` handling and used replacement upserts for the initial copy and insert replay to reduce duplicate-key failures.

## Review Notes
- The `mongodump`, `mongorestore`, TLS certificate, Boto3 DocumentDB cluster creation, retryWrites guidance, and CloudWatch namespace/metric examples were checked against official documentation and are broadly correct.
- The custom change stream example is still a simplified migration pattern. A production implementation should persist resume tokens, handle stream restarts, monitor lag, and test behavior for collection drops, renames, and schema/index changes.
