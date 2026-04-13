# Validation Summary: How to Enable Wire Protocol Compression in MongoDB

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MongoDB (server configuration, wire protocol compression)
- MongoDB Node.js Driver
- PyMongo (Python Driver)
- MongoDB Java Sync Driver
- MongoDB Go Driver
- Compression algorithms: snappy, zlib, zstd

## Sources Consulted
- MongoDB Self-Managed Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB mongod Reference: https://www.mongodb.com/docs/manual/reference/program/mongod/
- MongoDB Node.js Driver - Network Compression: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/network-compression/
- MongoDB Java Driver - Network Compression: https://www.mongodb.com/docs/drivers/java/sync/current/connection/specify-connection-options/network-compression/
- MongoDB Go Driver - Network Compression: https://www.mongodb.com/docs/drivers/go/current/connect/connection-options/network-compression/
- MongoDB PyMongo Driver - Network Compression: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/connect/connection-options/network-compression/
- MongoDB Wire Compression Specification (OP_COMPRESSED): https://github.com/mongodb/specifications/blob/master/source/compression/OP_COMPRESSED.md
- MongoDB serverStatus Command: https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- MongoDB hello Command: https://www.mongodb.com/docs/manual/reference/command/hello/
- Node.js Driver MongoClientOptions API: https://mongodb.github.io/node-mongodb-native/4.2/interfaces/MongoClientOptions.html

## Issues Found

1. **Compression negotiation description was incorrect**: The post stated the server responds with "the first compressor from the client's list that it also supports." Per the MongoDB wire compression specification, the server actually returns the full intersection of its supported compressors and the client's list. The *client* then selects the first compressor from its own configured list that appears in the server's response. Fixed the negotiation steps to accurately describe this two-phase process.

2. **zlib compression level range was wrong**: The post stated the valid range for `zlibCompressionLevel` is 1-9 in two places. The actual valid range is 0-9, where 0 means no compression. Fixed both occurrences (in the Node.js driver examples) to show the correct range.

## Review Notes
- The claim that snappy is "default in most drivers" is slightly misleading. Drivers do not enable any wire protocol compressor by default; compression must be explicitly configured. However, `mongod`/`mongos` servers do default to supporting `snappy,zstd,zlib`. This is a minor nuance and not an outright error in the current wording.
- The zlib default compression level is technically -1 in driver parameters (meaning "use zlib's internal default"), which effectively resolves to level 6. The post's description of 6 as the default is pragmatically correct.
- All code examples (Node.js, Python, Java, Go) use correct and current API syntax.
- Server configuration YAML format and command-line flags are correct.
- The verification commands (`serverStatus` and `hello`) are accurate.
