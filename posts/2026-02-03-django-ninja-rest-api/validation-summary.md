# Validation Summary: How to Build REST APIs with Django Ninja

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Django (web framework)
- Django Ninja (REST API framework)
- Pydantic (data validation)
- PyJWT (JWT authentication)
- Python typing (type hints)
- Django ORM
- OpenAPI / Swagger

## Sources Consulted
- Django Ninja official documentation: https://django-ninja.dev/
- Django Ninja Schemas guide: https://django-ninja.dev/guides/input/schemas/
- Django Ninja ModelSchema: https://django-ninja.dev/guides/response/django-pydantic/
- Django Ninja Authentication: https://django-ninja.dev/guides/authentication/
- Django Ninja Pagination: https://django-ninja.dev/guides/response/pagination/
- Django Ninja Routers: https://django-ninja.dev/guides/routers/
- Django Ninja Testing: https://django-ninja.dev/guides/testing/
- Pydantic v2 documentation: https://docs.pydantic.dev/latest/
- Django documentation: https://docs.djangoproject.com/
- PyJWT documentation: https://pyjwt.readthedocs.io/

## Issues Found
No technical issues found. All Django Ninja APIs, decorators, classes, and import paths used in the post match the official documentation:

- `NinjaAPI` constructor parameters (title, version, description, docs_url, openapi_url, auth) are correct
- HTTP method decorators (`@api.get`, `@api.post`, `@api.put`, `@api.patch`, `@api.delete`) are correct
- `Query(...)` usage for required list query parameters is correct
- `Schema` and `ModelSchema` from `ninja` are correctly used
- `ModelSchema.Meta` with `model`, `fields`, and `exclude` attributes is correct
- Pagination imports (`paginate`, `PageNumberPagination` from `ninja.pagination`) are correct
- Security classes (`APIKeyHeader`, `HttpBearer` from `ninja.security`) with their respective methods (`authenticate`) are correct
- Multiple response types syntax `response={200: ..., 404: ...}` is correct
- `api.exception_handler(...)` decorator and `api.create_response(...)` method are correct
- `Router` from `ninja` and `api.add_router(...)` are correct
- `TestClient` from `ninja.testing` is correct
- Django Model definitions, ORM patterns, and `get_object_or_404` usage are correct
- JWT handling with PyJWT (`jwt.encode`, `jwt.decode`, `jwt.InvalidTokenError`) is correct

## Review Notes
The following are not technical errors but are worth noting for future updates:

1. **`datetime.utcnow()` deprecation**: The `create_token` function in the JWT section uses `datetime.datetime.utcnow()`, which is deprecated as of Python 3.12 in favor of `datetime.datetime.now(datetime.timezone.utc)`. The code still works and emits only a DeprecationWarning.

2. **`payload.dict()` in Pydantic v2**: The post uses `.dict()` and `.dict(exclude_unset=True)` throughout. In Pydantic v2 these are deprecated in favor of `.model_dump()` / `.model_dump(exclude_unset=True)`. Django Ninja's `Schema` class retains `.dict()` for backward compatibility, so the code functions correctly, but `.model_dump()` is the preferred modern API.

3. **`ErrorResponse` schema**: In the "Multiple Response Types" example, `ErrorResponse` is imported from `.schemas` but is not defined elsewhere in the post. Readers would need to define a simple schema such as `class ErrorResponse(Schema): detail: str` on their own. This is a small omission rather than an error.

4. **`EmailStr` dependency**: The post uses `pydantic.EmailStr` without mentioning that it requires the `email-validator` package (`pip install pydantic[email]`). This is a common Pydantic pattern but the dependency requirement is implicit.

5. **`PageNumberPagination` response shape**: When using `@paginate(PageNumberPagination)`, the actual response shape includes `items` and `count` fields wrapping the list, so the documented `response=List[ProductSchema]` is what Django Ninja's docs show but the resulting OpenAPI schema reflects the wrapper structure. This matches official docs' guidance.
