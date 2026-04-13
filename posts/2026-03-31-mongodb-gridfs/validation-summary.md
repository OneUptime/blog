# Validation Summary: How to Use GridFS in MongoDB for Large File Storage

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB GridFS
- Node.js MongoDB driver (`mongodb` package, `GridFSBucket`)
- Python PyMongo (`gridfs.GridFS`)
- Express.js (file serving endpoint)
- `mongofiles` CLI (MongoDB Database Tools)

## Sources Consulted
- MongoDB GridFS specification: https://www.mongodb.com/docs/manual/core/gridfs/
- MongoDB `mongofiles` reference: https://www.mongodb.com/docs/database-tools/mongofiles/
- Node.js MongoDB driver GridFSBucket API: https://mongodb.github.io/node-mongodb-native/6.0/classes/GridFSBucket.html
- PyMongo GridFS API: https://pymongo.readthedocs.io/en/stable/api/gridfs/index.html
- MongoDB TTL indexes: https://www.mongodb.com/docs/manual/core/index-ttl/

## Issues Found

1. **`mongofiles put` path mismatch**: The upload command used `put /path/to/report.pdf`, which stores the file in GridFS with the name `/path/to/report.pdf`. The subsequent `get report.pdf` and `delete report.pdf` commands would fail because they look for a file named `report.pdf`, not `/path/to/report.pdf`. Fixed by adding the `--local /path/to/report.pdf` flag to separate the local file path from the GridFS filename (`put report.pdf`).

2. **TTL index on `fs.files` causes orphaned chunks**: The best practices section recommended adding a TTL index on `fs.files.uploadDate` for automatic file expiration. This is harmful because TTL indexes only delete documents from the collection they are defined on (`fs.files`), leaving the associated binary chunks in `fs.chunks` as orphans. Fixed by replacing with advice to use a scheduled cleanup job that calls `bucket.delete()` to properly remove both the file document and all associated chunks.

3. **Deprecated `GridFS.exists()` in Python**: The Python example used `fs.exists(filename="report.pdf")`, which was deprecated in PyMongo 3.x and removed in PyMongo 4.0. Replaced with `fs.find_one({"filename": "report.pdf"})` which is the recommended approach and works across all current PyMongo versions.

## Review Notes
- The post uses `gridfs.GridFS` (legacy API) for Python examples. PyMongo also provides `gridfs.GridFSBucket` which mirrors the Node.js `GridFSBucket` API and is the newer recommended approach. Both are currently supported, so the legacy API usage is not incorrect but could be noted for a future update.
- The Node.js examples use `require()` (CommonJS) syntax. This is still widely used and correct, though ES module (`import`) syntax is increasingly common. Not an error.
- The chunk size is described as "255KB" in text and `261120` bytes in code. Strictly, this is 255 KiB (kibibytes = 255 x 1024), not 255 KB (kilobytes = 255 x 1000). The code value is correct; the text follows common informal usage where "KB" means 1024 bytes.
