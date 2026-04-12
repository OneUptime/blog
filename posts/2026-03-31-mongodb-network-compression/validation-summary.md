# Validation Summary: How to Configure Network Compression in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (server configuration, replica sets, sharded clusters)
- MongoDB wire protocol compression (snappy, zstd, zlib)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)
- Java MongoDB driver
- mongosh

## Sources Consulted
- MongoDB official documentation: `net.compression.compressors` configuration option (https://www.mongodb.com/docs/manual/reference/configuration-options/#mongodb-setting-net.compression.compressors)
- MongoDB OP_COMPRESSED wire protocol specification (https://github.com/mongodb/specifications/blob/master/source/compression/OP_COMPRESSED.md)
- MongoDB `hello` command documentation (https://www.mongodb.com/docs/manual/reference/command/hello/)
- MongoDB `isMaster` deprecation notice (deprecated in MongoDB 5.0)
- MongoDB `serverStatus` network output documentation (https://www.mongodb.com/docs/manual/reference/command/serverStatus/#network)
- MongoDB 4.2 release notes for zstd introduction
- Node.js MongoDB driver source (`connection_string.ts`) for `compressors` option
- PyMongo `MongoClient` documentation for `compressors` parameter

## Issues Found

1. **`isMaster` command deprecated (line 66)**: The post used `db.adminCommand({ isMaster: 1 }).compression` to verify negotiated compressors. `isMaster` was deprecated in MongoDB 5.0 (released 2021) and replaced by `hello`. Changed to `db.adminCommand({ hello: 1 }).compression`.

2. **Compression negotiation description inaccurate (line 33)**: The post stated "The server responds with the first compressor from the client's list that it also supports." Per the MongoDB OP_COMPRESSED specification, the server returns the list of mutually supported compressors, and the **client** picks the first compressor from its own preference list that appears in the server's list. Reworded to accurately describe the client-driven selection.

3. **Mermaid diagram inconsistent with negotiation logic**: The diagram showed the client sending `snappy, zstd` but the server picking `zstd` (the second in the client's list). Updated to show `zstd, snappy` as the client's list with the server supporting `zstd, zlib`, so `zstd` is correctly chosen as the first match from the client's preference order.

4. **`physicalBytesIn`/`physicalBytesOut` version requirement missing**: These `serverStatus.network` fields were introduced in MongoDB 5.0, but the post did not note this. Since the post recommends MongoDB 4.2+ for zstd, readers on 4.2-4.4 would not see these fields. Added "(MongoDB 5.0+)" to the output description.

## Review Notes
- The `storage.wiredTiger.collectionConfig.blockCompressor` reference for storage compression is correct.
- All driver code examples (Node.js, PyMongo, Java) use correct and current APIs.
- The YAML configuration format for `net.compression.compressors` correctly uses a comma-separated string, matching MongoDB's expected format.
- The post's recommendation of `zstd` as the default for MongoDB 4.2+ is sound and aligns with MongoDB's own recommendations.
