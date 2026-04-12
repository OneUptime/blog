# Validation Summary: How to Import Data from REST APIs into MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python 3 (requests library, datetime module)
- pymongo (MongoClient, insert_many, UpdateOne, bulk_write)
- MongoDB (upsert operations, unique indexes, $set, $setOnInsert operators)
- REST APIs (pagination, Link header parsing, rate limiting with HTTP 429 / Retry-After)

## Sources Consulted
- pymongo official documentation: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html (insert_many, bulk_write, create_index, UpdateOne, BulkWriteResult attributes)
- Python requests library documentation: https://docs.python-requests.org/en/latest/
- Python datetime deprecation notes (PEP 597 / Python 3.12 changelog): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- MongoDB $set and $setOnInsert operator documentation: https://www.mongodb.com/docs/manual/reference/operator/update/set/ and https://www.mongodb.com/docs/manual/reference/operator/update/setOnInsert/
- GitHub REST API documentation (Link header pagination): https://docs.github.com/en/rest/using-the-rest-api/using-pagination-in-the-rest-api
- HTTP 429 Too Many Requests / Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429

## Issues Found
1. **`datetime.utcnow()` deprecated since Python 3.12** — Replaced all three occurrences of `datetime.utcnow()` with `datetime.now(timezone.utc)` and updated the import from `from datetime import datetime` to `from datetime import datetime, timezone`. The `utcnow()` method was deprecated in Python 3.12 (October 2023) because it returns a naive datetime without timezone info, which can lead to subtle bugs. The replacement `datetime.now(timezone.utc)` returns a timezone-aware datetime and is the recommended approach.

## Review Notes
- The GitHub API Accept header `application/vnd.github.v3+json` still works but GitHub now recommends `application/vnd.github+json` along with an `X-GitHub-Api-Version` header to pin the API version. Not changed since the post is about MongoDB import patterns rather than GitHub API best practices, and the existing header remains functional.
- The `fetch_with_retry` function only catches `HTTPError` (raised by `raise_for_status()`). Connection errors, timeouts, and other `requests.exceptions.RequestException` subtypes are not retried. This is acceptable for a tutorial but production code would benefit from catching broader exception types.
- Rate limit retries (HTTP 429) in `fetch_with_retry` consume one of the `max_retries` attempts, meaning rate limiting reduces the retry budget available for other transient errors. A production implementation might want separate counters.
- All pymongo API usage is correct: `MongoClient`, `insert_many`, `UpdateOne`, `bulk_write(ordered=False)`, `BulkWriteResult.upserted_count`, `BulkWriteResult.modified_count`, and `create_index` with `unique=True` are all valid and current.
- The Link header parsing regex and logic for GitHub-style pagination is correct.
- The upsert pattern combining `$set` with `$setOnInsert` is a well-established MongoDB pattern for tracking both latest and first-import timestamps.
