# Validation Summary: How to Handle Exceptions Globally in FastAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python
- FastAPI
- Starlette (for HTTPException and BaseHTTPMiddleware)
- Pydantic v2 (BaseModel, ConfigDict / json_schema_extra)
- SQLAlchemy (for the database error handling decorator example)
- pytest / FastAPI TestClient (for the testing section)

## Sources Consulted
- FastAPI documentation: https://fastapi.tiangolo.com/tutorial/handling-errors/
- Starlette exceptions: https://www.starlette.io/exceptions/
- Pydantic v2 migration guide: https://docs.pydantic.dev/latest/migration/
- Pydantic v2 error types reference: https://docs.pydantic.dev/latest/errors/validation_errors/
- Python 3.12 release notes (datetime.utcnow deprecation): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- SQLAlchemy 2.x docs (NoResultFound location): https://docs.sqlalchemy.org/en/20/orm/queryguide/query.html

## Issues Found
1. **Deprecated `datetime.utcnow()`** in `create_error_response` — As of Python 3.12, `datetime.utcnow()` is deprecated because it returns a naive datetime. Replaced with `datetime.now(timezone.utc)` and added the `timezone` import to the import block.
2. **Deprecated `item.dict()`** in the routes example — `.dict()` is a Pydantic v1 method that emits deprecation warnings in Pydantic v2 (which current FastAPI requires). Replaced with `item.model_dump()`.
3. **Outdated Pydantic v1 validation error format** in the `ValidationErrorResponse` example — The example used the v1 format `type_error.float` with message `"value is not a valid float"`. Updated to the Pydantic v2 format: `type: "float_parsing"` with the corresponding v2 message `"Input should be a valid number, unable to parse string as a number"`.

## Review Notes
- Using a custom class named `ValidationError` could shadow Pydantic's `ValidationError` if both are imported into the same module. The post imports them from separate modules in the examples so there is no conflict, but readers should be aware.
- The `class Config: json_schema_extra = {...}` pattern still works in Pydantic v2 but the more idiomatic v2 form is `model_config = ConfigDict(json_schema_extra=...)`. The legacy form remains supported, so this was not changed.
- `NoResultFound` is importable from both `sqlalchemy.exc` (used in the post) and `sqlalchemy.orm.exc`. The `sqlalchemy.exc` import works in SQLAlchemy 1.4 and 2.x — left as written.
- `BaseHTTPMiddleware` in Starlette has well-known limitations with streaming responses and background tasks; this is beyond the scope of the post but worth noting for production use.
- Registering an `Exception` handler with `@app.exception_handler(Exception)` works in FastAPI, but it will still let `StarletteHTTPException` reach its more specific handler because exception handler resolution is by exact type / MRO ordering — correct behavior here.
