# Validation Summary: How to Migrate from MongoDB to DynamoDB

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- MongoDB (mongoexport CLI)
- Amazon DynamoDB (single-table design, GSIs, key design)
- Python boto3 SDK (DynamoDB resource, batch_writer, query)
- PyMongo (count_documents for validation)
- JavaScript / MongoDB Shell (query examples)

## Sources Consulted
- AWS boto3 DynamoDB documentation: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dynamodb.html
- AWS DynamoDB Developer Guide (data types, key design, GSIs): https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/
- MongoDB mongoexport documentation: https://www.mongodb.com/docs/database-tools/mongoexport/
- PyMongo documentation (count_documents): https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html
- Python decimal module documentation: https://docs.python.org/3/library/decimal.html

## Issues Found
- **Inaccurate claim about DynamoDB float support (line 80):** The post stated "DynamoDB does not support float natively" which is incorrect. DynamoDB's Number type fully supports floating-point values. The actual limitation is in the boto3 Python SDK, which requires `Decimal` objects instead of Python `float` to prevent floating-point precision loss. Changed to: "The boto3 SDK does not accept Python `float` values for DynamoDB number attributes - use `Decimal` to avoid floating-point precision issues."

## Review Notes
- `datetime.utcnow()` (line 61) is deprecated since Python 3.12 in favor of `datetime.now(datetime.UTC)`. It still works without error but generates a deprecation warning. Not fixed since it is used only as a fallback default and the migration code is illustrative.
- The `_id` extraction logic (line 58) assumes Extended JSON format (`{"$oid": "..."}`) which is correct for `mongoexport --jsonArray` output with ObjectId fields, but would raise `AttributeError` if `_id` were a plain string. This edge case is unlikely in the described scenario.
- The `total` field is stored as a string (line 62) while a later section recommends using `Decimal` for numbers. This inconsistency is minor since the sections serve different illustrative purposes, but readers following both sections should use `Decimal` for numeric attributes they need to query or compare numerically.
- The DynamoDB query equivalent for "get all orders sorted by createdAt descending" uses `ScanIndexForward=False` on the main table key, which sorts by sort key (`ORDER#{orderId}`) not by `createdAt`. This approximation works if order IDs are monotonically increasing (as with MongoDB ObjectIds) but is not an exact equivalent.
