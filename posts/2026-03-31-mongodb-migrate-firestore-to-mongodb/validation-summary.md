# Validation Summary: How to Migrate from Firebase Firestore to MongoDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Firebase Firestore (Python Admin SDK)
- MongoDB (PyMongo driver, Node.js driver)
- Python (firebase_admin, google-cloud-firestore, google-api-core)
- JavaScript / Node.js (Firestore v9 modular SDK, MongoDB Node.js driver)
- MongoDB Change Streams

## Sources Consulted
- google-cloud-firestore Python SDK source code (`google/cloud/firestore_v1/__init__.py` exports) — https://github.com/googleapis/python-firestore
- google-api-core `DatetimeWithNanoseconds` class — https://github.com/googleapis/python-api-core/blob/main/google/api_core/datetime_helpers.py
- PyMongo `BulkWriteResult` documentation — https://pymongo.readthedocs.io/en/stable/api/pymongo/results.html
- MongoDB Change Streams documentation — https://www.mongodb.com/docs/manual/changeStreams/
- MongoDB Node.js driver `watch()` method and `fullDocument` option — https://www.mongodb.com/docs/drivers/node/current/usage-examples/changeStream/
- Firebase Admin Python SDK documentation — https://firebase.google.com/docs/firestore/manage-data/export-import

## Issues Found

1. **Incorrect import path for `DatetimeWithNanoseconds`**: The post used `from google.cloud.firestore_v1 import DatetimeWithNanoseconds`, but `DatetimeWithNanoseconds` is not exported from `google.cloud.firestore_v1`. It lives in `google.api_core.datetime_helpers`. Fixed to `from google.api_core.datetime_helpers import DatetimeWithNanoseconds`.

2. **Missing `fullDocument` option on MongoDB change stream**: The `watch()` call did not include `{ fullDocument: "updateLookup" }`. Without this option, `change.fullDocument` is `undefined` for update events — only the delta (`updateDescription`) is provided. Since the example is positioned as a replacement for Firestore's `onSnapshot` (which always provides the full document), this omission would cause the replacement to silently fail on updates. Fixed by adding the `{ fullDocument: "updateLookup" }` option.

## Review Notes
- The `normalize_references` function uses `obj.id` (returns only the document ID, not the full path). For references to documents in subcollections, this loses the collection context. Using `obj.path` would preserve the full reference path. This is a design tradeoff the author has made and is documented ("store as string ID"), so it was not changed.
- The `convert_timestamps` function replaces `tzinfo` with UTC. In practice, Firestore timestamps returned by the Python SDK are already UTC-aware, so the conversion is technically redundant but harmless and serves as a safety measure.
- MongoDB 6.0+ introduced additional `fullDocument` options (`"whenAvailable"`, `"required"`) that use change stream pre/post images. The post's approach using `"updateLookup"` is compatible with all MongoDB versions that support change streams (3.6+).
