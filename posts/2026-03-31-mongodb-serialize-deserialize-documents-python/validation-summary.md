# Validation Summary: How to Serialize and Deserialize MongoDB Documents in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Python
- PyMongo (bson library)
- BSON types (ObjectId, Decimal128, Binary, Regex)
- Flask
- Pydantic v2

## Sources Consulted
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/
- bson.json_util documentation: https://pymongo.readthedocs.io/en/stable/api/bson/json_util.html
- Pydantic v2 migration guide: https://docs.pydantic.dev/latest/migration/
- Pydantic v2 custom types documentation: https://docs.pydantic.dev/latest/concepts/types/#custom-types
- Pydantic v2 serialization documentation: https://docs.pydantic.dev/latest/concepts/serialization/
- Python datetime documentation (UTC sentinel): https://docs.python.org/3/library/datetime.html

## Issues Found

### 1. Pydantic section mixed v1 and v2 APIs (would not work at runtime)
**What was wrong:** The Pydantic example used `__get_validators__` (a Pydantic v1 custom type hook removed in v2), `class Config` with `json_encoders` (v1 pattern replaced by `model_config = ConfigDict(...)` and `@field_serializer` in v2), while simultaneously using `model_dump_json()` (a v2-only method). This combination would fail at runtime with any version of Pydantic.
**What was changed:** Rewrote the Pydantic section to use pure v2 patterns: `__get_pydantic_core_schema__` for the custom ObjectId type, `model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)` for model configuration, and `@field_serializer` for datetime serialization.

### 2. Unused import in Flask example
**What was wrong:** `jsonify` was imported from Flask but never used (the code uses `json.dumps` with the custom encoder instead).
**What was changed:** Removed `jsonify` from the Flask import statement.

## Review Notes
- The `datetime.now(UTC)` and `from datetime import UTC` patterns require Python 3.11+. This is not called out in the post but is the modern recommended approach.
- Converting `Decimal128` to `float` in the custom JSON encoder (line `return float(str(obj))`) can lose precision for monetary values. This is a common trade-off for API responses and is noted in context, but readers working with financial data should be aware.
- The BSON type mapping table is accurate for current PyMongo versions.
- The `bson.json_util.default` / `bson.json_util.object_hook` approach for JSON serialization is correct and well-documented.
