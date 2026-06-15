# Validation Summary: How to Reduce Bandwidth with MongoDB Compression

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- MongoDB wire protocol compression
- MongoDB WiredTiger storage compression
- MongoDB Node.js Driver
- PyMongo
- JavaScript
- Python
- MongoDB configuration files

## Sources Consulted
- MongoDB Node.js Driver: Network Compression: https://www.mongodb.com/docs/drivers/node/current/connect/connection-options/network-compression/
- PyMongo Driver: Compress Network Traffic: https://www.mongodb.com/docs/languages/python/pymongo-driver/current/connect/connection-options/network-compression/
- MongoDB Manual: Self-Managed Configuration File Options: https://www.mongodb.com/docs/manual/reference/configuration-options/
- MongoDB Manual: WiredTiger Storage Engine: https://www.mongodb.com/docs/manual/core/wiredtiger/
- MongoDB Manual: serverStatus Command: https://www.mongodb.com/docs/manual/reference/command/serverstatus/
- MongoDB Manual: $collStats Aggregation Stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/collstats/
- MongoDB Manual: db.createCollection Storage Engine Options: https://www.mongodb.com/docs/manual/reference/method/db.createcollection/
- MongoDB Manual: db.collection.storageSize(): https://www.mongodb.com/docs/manual/reference/method/db.collection.storagesize/

## Issues Found
- The post claimed typical wire compression reduces bandwidth by 60-80%. I changed this to a workload-dependent statement because the official docs describe compression support but do not guarantee a typical percentage.
- The Node.js `zlibCompressionLevel` comment listed only levels 1-9. I corrected it to `-1` through `9`, matching the Node.js driver documentation.
- The Node.js and PyMongo examples omitted required optional dependencies for zstd and snappy. I added notes for `@mongodb-js/zstd`, `snappy`, `zstandard`, and `python-snappy`.
- The Node.js storage examples used `collection.stats()`, which is a mongosh helper rather than the current driver pattern. I replaced those calls with `$collStats` aggregation using `storageStats`.
- The monitoring example sorted with an undefined `parseBytes()` helper. I changed it to keep a numeric `storageSizeBytes` field for sorting and remove it from returned rows.
- The storage statistics example used only `avgObjSize`; `$collStats.storageStats` returns `avgObjectSize`. I updated the code to handle both names.
- The document-structure section described short field names as "more compressible." I changed this to "smaller raw BSON" to avoid implying that shorter field names inherently improve compression ratio.
- The summary said to start with "default zstd compression." I corrected this because MongoDB's WiredTiger default block compressor is snappy for most collections, with zstd as the default for time-series collections.

## Review Notes
The algorithm comparison table remains an approximate workload-oriented guideline. Actual compression ratios and CPU costs should be benchmarked against representative documents, indexes, deployment versions, and read/write patterns.
