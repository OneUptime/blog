# Validation Summary: How to Use MongoEngine ODM with MongoDB and Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Python
- MongoEngine (Python ODM)

## Sources Consulted
- MongoEngine official documentation: https://docs.mongoengine.org/
- MongoEngine API reference for Document, QuerySet, and field types: https://docs.mongoengine.org/apireference.html
- PyPI MongoEngine package: https://pypi.org/project/mongoengine/

## Issues Found
1. **Bulk update uses undefined field `active`**: The example `User.objects(role="guest").update(set__active=False)` references a field `active` that is not defined on the `User` document class. MongoEngine validates field names in QuerySet update operations against the document schema, so this would raise an `InvalidQueryError` at runtime. Changed to `User.objects(role="guest").update(set__role="user")` to use a field that exists on the model.

## Review Notes
- `datetime.utcnow()` is deprecated as of Python 3.12 in favor of `datetime.now(datetime.UTC)`. The code still works but will emit a deprecation warning on Python 3.12+. This is a minor version-specific caveat, not a correctness issue.
- In the `me.connect()` call, both `db="mydb"` and `host="mongodb://localhost:27017/mydb"` specify the database name. When a URI is provided in `host`, the database in the URI takes precedence and the `db` parameter is redundant. This is not an error but is slightly misleading.
