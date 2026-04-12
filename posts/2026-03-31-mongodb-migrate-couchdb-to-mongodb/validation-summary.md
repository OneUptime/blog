# Validation Summary: How to Migrate from CouchDB to MongoDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Apache CouchDB (HTTP API, `_all_docs` endpoint, attachments, design documents/views)
- MongoDB (PyMongo driver, aggregation pipelines, `bulk_write`, `count_documents`)
- Python (pymongo, requests, boto3)
- Node.js (MongoDB driver)
- AWS S3 (attachment storage)
- couchdb-dump (npm CLI tool)

## Sources Consulted
- CouchDB official documentation — `/{db}/_all_docs` endpoint (https://docs.couchdb.org/en/stable/api/database/bulk-api.html)
- CouchDB official documentation — `GET /{db}` database info endpoint (https://docs.couchdb.org/en/stable/api/database/common.html)
- CouchDB official documentation — `/{db}/{docid}/{attname}` attachment endpoint (https://docs.couchdb.org/en/stable/api/document/attachments.html)
- PyMongo official documentation — `bulk_write()` and `BulkWriteResult` (https://pymongo.readthedocs.io/en/stable/examples/bulk.html)
- PyMongo source code — `__init__.py` top-level exports confirming `InsertOne` is re-exported from `pymongo`
- PyMongo source code — `results.py` confirming `inserted_count` property on `BulkWriteResult`
- PyMongo official documentation — `count_documents()` method (https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html)
- npm `couchdb-dump` package and danielebailo/couchdb-dump GitHub repository for CLI flag verification

## Issues Found
- **`couchdb-dump` CLI invocation was incorrect.** The blog showed `couchdb-dump -H localhost -d products -u admin -p password` with flags (`-H`, `-d`, `-u`, `-p`) that belong to danielebailo's bash shell script, not the npm package. The npm `couchdb-dump` package uses URL-based invocation. Fixed the command to `couchdb-dump "http://admin:password@localhost:5984/products"` to match the actual npm package CLI usage.

## Review Notes
- The first code block uses `json` syntax highlighting but contains a `// CouchDB document` comment. JSON does not support comments, but this is a common convention in blog posts for illustrative labeling and does not affect the technical accuracy of the content shown.
- The summary states "both store JSON" — CouchDB stores JSON natively while MongoDB stores BSON (Binary JSON). This is technically imprecise but acceptable shorthand in a migration context since both present JSON-like documents at the API level.
- The validation snippet does not import `requests`, but this is understood as a continuation of earlier code in the post.
- The Python migration script does not handle deleted documents (rows with `_deleted: true`), which could appear in `_all_docs` output. This is a minor omission acceptable for a tutorial.
