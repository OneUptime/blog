# Validation Summary: How to Choose the Best Wire Compression Algorithm for MongoDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (wire protocol compression)
- Snappy compression algorithm
- Zlib compression algorithm
- Zstd (Zstandard) compression algorithm
- PyMongo (Python MongoDB driver)

## Sources Consulted
- MongoDB official documentation on network compression: https://www.mongodb.com/docs/manual/reference/configuration-options/#net.compression.compressors
- MongoDB official documentation on connection string URI format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB release notes for 3.4, 3.6, and 4.2 (wire compression feature introductions)
- PyMongo documentation on compression options: https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html

## Issues Found

1. **Zlib minimum version incorrect**: The comparison table listed Zlib's minimum MongoDB version as 3.4, but Zlib wire compression was introduced in MongoDB 3.6. Changed "MongoDB 3.4" to "MongoDB 3.6" in the trade-offs table.

2. **Invalid `compressors=disabled` connection string value**: The benchmark Python code used `compressors=disabled` for the no-compression baseline, but `disabled` is not a valid compressor value. Omitting the `compressors` parameter entirely is the correct way to connect without compression. Changed the URI to `mongodb://host:27017/db`.

3. **Incorrect default Zstd compression level**: The post stated "Zstd at default level 3" but MongoDB uses Zstd compression level 6 by default for wire protocol compression. Changed "default level 3" to "default level 6".

## Review Notes
- The benchmark code measures `serverStatus.network.bytesOut` which tracks total server-wide bytes, not per-connection. This would be inaccurate if other connections are active during the test, but is acceptable as a conceptual illustration for an isolated test environment.
- The compression ratio estimates (40-60% for Snappy, 55-75% for Zstd) are reasonable ballpark figures but will vary significantly depending on data characteristics.
