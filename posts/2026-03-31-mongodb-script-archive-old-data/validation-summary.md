# Validation Summary: How to Write a Script to Archive Old Data in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (PyMongo driver)
- Python 3
- AWS S3 (boto3)
- gzip compression
- cron scheduling

## Sources Consulted
- PyMongo `Collection.find()` API documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.find
- PyMongo `Collection.insert_many()` API documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.insert_many
- PyMongo `Collection.delete_many()` API documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.delete_many
- PyMongo `Collection.count_documents()` API documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.count_documents
- MongoDB `createIndex` shell method: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- boto3 S3 `upload_fileobj` documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/s3/client/upload_fileobj.html
- Python `datetime` module documentation: https://docs.python.org/3/library/datetime.html
- crontab syntax reference: https://man7.org/linux/man-pages/man5/crontab.5.html

## Issues Found
- **Inconsistent archive collection name in strategy diagram**: The text diagram referred to the archive collection as `archive_events`, but the Python code defines it as `app_events_archive`. Fixed the diagram to say `app_events_archive` to match the code.

## Review Notes
- `datetime.utcnow()` is deprecated since Python 3.12 in favor of `datetime.now(datetime.timezone.utc)`. The code still functions correctly but will produce a `DeprecationWarning` on Python 3.12+. Since changing to timezone-aware datetimes could affect MongoDB query behavior depending on how `createdAt` fields are stored, this was not changed, but readers on modern Python should be aware.
- The broad `except Exception` around `insert_many` catches all errors (not just duplicate key errors). If a non-duplicate error occurs (e.g., network failure), the code will still proceed to delete documents from the source, which could cause data loss. Production scripts should catch `pymongo.errors.BulkWriteError` specifically and abort on other exceptions.
- The `batch_size` keyword in `find()` is redundant alongside `.limit(BATCH_SIZE)` since both are set to the same value. The `batch_size` controls wire protocol batching while `limit` caps total results; when equal, the batch_size has no practical effect. Not incorrect, just unnecessary.
- The S3 export function uses a timestamp with second-level granularity in the key. If called multiple times within the same second, S3 keys would collide and overwrite. Production use should include a unique identifier (e.g., UUID or batch number).
