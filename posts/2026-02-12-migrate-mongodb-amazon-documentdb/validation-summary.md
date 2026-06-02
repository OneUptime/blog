# Validation Summary: How to Migrate from MongoDB to Amazon DocumentDB

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon DocumentDB
- MongoDB
- AWS Database Migration Service
- AWS CLI
- MongoDB Database Tools (`mongodump`, `mongorestore`)
- PyMongo
- TLS/CA certificate configuration

## Sources Consulted
- Amazon DocumentDB supported MongoDB APIs, operations, data types, indexes, and index properties: https://docs.aws.amazon.com/documentdb/latest/devguide/mongo-apis.html
- Amazon DocumentDB functional differences from MongoDB: https://docs.aws.amazon.com/documentdb/latest/devguide/functional-differences.html
- Amazon DocumentDB client-side field level encryption: https://docs.aws.amazon.com/documentdb/latest/devguide/field-level-encryption.html
- Amazon DocumentDB change streams: https://docs.aws.amazon.com/documentdb/latest/devguide/change_streams.html
- Amazon DocumentDB transactions: https://docs.aws.amazon.com/documentdb/latest/devguide/transactions.html
- Amazon DocumentDB connection examples: https://docs.aws.amazon.com/documentdb/latest/devguide/connect_programmatically.html
- Amazon DocumentDB index creation and troubleshooting: https://docs.aws.amazon.com/documentdb/latest/devguide/index-creation.html and https://docs.aws.amazon.com/documentdb/latest/devguide/troubleshooting.index-creation.html
- AWS DMS MongoDB source documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Source.MongoDB.html
- AWS DMS DocumentDB target documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Target.DocumentDB.html
- AWS CLI `dms create-endpoint` reference: https://docs.aws.amazon.com/cli/latest/reference/dms/create-endpoint.html
- Amazon DocumentDB compatibility tool README: https://github.com/awslabs/amazon-documentdb-tools/tree/master/compat-tool
- MongoDB Database Tools `mongorestore` documentation: https://www.mongodb.com/docs/database-tools/mongorestore/
- PyMongo `MongoClient` documentation: https://pymongo.readthedocs.io/

## Issues Found
- The compatibility tool command used an unsupported `--output-file` option and implied that the tool analyzes collections and indexes. Updated the command to use `--uri` with `/admin?directConnection=true` and `--version`, and clarified that the tool checks `serverStatus()` counters, profiling logs, or source code for unsupported operators.
- The post said client-side field-level encryption is unsupported. Amazon DocumentDB now supports explicit client-side FLE with limitations, so the checklist now describes the supported but limited behavior.
- The post described `$graphLookup` as having limited support. Amazon DocumentDB's supported API matrix lists `$graphLookup` as unsupported, so this was corrected.
- The index compatibility note was too broad. Updated it to state that partial index support is version-specific and wildcard indexes are unsupported.
- The AWS DMS MongoDB endpoint example used table mode (`NestingLevel=one`) and a hyphenated `scram-sha-1` value. Updated it to document mode (`NestingLevel=none`), the official `scram_sha_1` value, and the correct `ExtractDocId` setting name.
- The DocumentDB PyMongo examples did not explicitly disable retryable writes for DocumentDB write paths. Added `retryWrites=False` to the DocumentDB client constructors.
- The DocumentDB connection string omitted `replicaSet=rs0`, which AWS includes in programmatic connection examples for cluster connections. Added it.
- The ObjectId ordering pitfall was inaccurate. Replaced it with the documented warning that Amazon DocumentDB does not guarantee implicit result ordering and applications should use explicit `sort()`.
- The write concern pitfall overstated DocumentDB behavior. Reworded it around DocumentDB's documented write durability behavior: writes are acknowledged after durable majority storage-node recording.
- The index build pitfall incorrectly said DocumentDB index builds always run in the background. Replaced it with the documented foreground/background behavior, background build latency caveat, and one-background-build-per-collection limitation.

## Review Notes
The migration approach is broadly valid. Future improvements could add security details for DMS TLS certificate configuration and more detailed rollback/idempotency guidance for the dual-write example, but those are completeness improvements rather than correctness blockers.
