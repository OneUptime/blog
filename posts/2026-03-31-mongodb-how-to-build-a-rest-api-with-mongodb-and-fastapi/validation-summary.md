# Validation Summary: How to Build a REST API with MongoDB and FastAPI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- FastAPI
- MongoDB
- Motor (async MongoDB driver for Python)
- Pydantic v2
- PyMongo
- Uvicorn (ASGI server)

## Sources Consulted
- FastAPI official documentation: https://fastapi.tiangolo.com/
- Motor (async MongoDB driver) documentation: https://motor.readthedocs.io/
- Pydantic v2 documentation: https://docs.pydantic.dev/latest/
- PyMongo documentation: https://pymongo.readthedocs.io/
- Python 3.12 datetime deprecation notices: https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- Pydantic EmailStr / email-validator: https://docs.pydantic.dev/latest/api/networks/#pydantic.networks.EmailStr

## Issues Found

1. **Missing `email-validator` dependency**: The `pip install` command listed `pydantic` but `EmailStr` requires the `email-validator` package. Without it, importing `EmailStr` raises an `ImportError`. Changed to `"pydantic[email]"` which installs the required extra.

2. **Unused `PyObjectId` class with deprecated Pydantic v1 API**: The `PyObjectId` class used `__get_validators__`, a Pydantic v1 pattern that does not work in Pydantic v2. The class was also never referenced anywhere in the tutorial code. Removed the class and its `from bson import ObjectId` import from the models.py section.

3. **`datetime.utcnow()` deprecated in Python 3.12+**: Two occurrences of `datetime.utcnow()` (in `create_user` and `update_user`) were replaced with `datetime.now(timezone.utc)`, the recommended replacement per Python 3.12+ deprecation notices. Added `timezone` to the datetime import.

4. **`return_document=True` instead of `ReturnDocument.AFTER`**: While `True` works (since `ReturnDocument.AFTER` equals `True`), using the named constant is the documented and idiomatic approach. Changed to `ReturnDocument.AFTER` and added `from pymongo import ReturnDocument` to the imports.

5. **Unused `JSONResponse` import**: `from fastapi.responses import JSONResponse` was imported but never used. Removed the dead import.

## Review Notes
- The `DuplicateKeyError` import inside the `create_user` function body is unconventional (typically placed at module top level), but it works correctly and doesn't cause a technical error.
- The `from_mongo` classmethod mutates the input `doc` dict in place (`doc['_id'] = str(doc['_id'])`). This is fine for the tutorial's use case but could surprise callers who reuse the dict. Not a bug, just worth noting.
- The `email.lower()` call lowercases the entire email address including the local part, which is technically case-sensitive per RFC 5321. However, this matches common real-world practice and is acceptable.
