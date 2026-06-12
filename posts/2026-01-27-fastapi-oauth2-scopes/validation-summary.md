# Validation Summary: How to Implement OAuth2 Scopes in FastAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- FastAPI
- Python
- OAuth2 scopes
- FastAPI security dependencies
- JWT bearer tokens
- Pydantic models
- passlib password hashing
- pytest and FastAPI TestClient

## Sources Consulted
- FastAPI OAuth2 scopes documentation: https://fastapi.tiangolo.com/advanced/security/oauth2-scopes/
- FastAPI security reference for `OAuth2PasswordBearer`, `OAuth2PasswordRequestForm`, and `SecurityScopes`: https://fastapi.tiangolo.com/reference/security/
- RFC 6750, OAuth 2.0 Bearer Token Usage: https://datatracker.ietf.org/doc/html/rfc6750
- RFC 6749, OAuth 2.0 Authorization Framework: https://datatracker.ietf.org/doc/html/rfc6749

## Issues Found
1. Several code snippets were presented as separate files but omitted imports required by the names used in those snippets. Fix: added the missing imports for `Depends`, `OAuth2PasswordBearer`, `SecurityScopes`, JWT helpers, shared auth objects, and typing helpers where needed.
2. The tests used `testuser`, which is not present in the example user database. That would cause authentication failure before the scope checks being tested. Fix: changed the test tokens to use `alice` or `admin`, depending on the test case.
3. The token endpoint test omitted `grant_type=password`. FastAPI's permissive `OAuth2PasswordRequestForm` accepts the omission, but OAuth2 password flow requests are spec-compliant when the field is present. Fix: added `grant_type`.
4. The token endpoint error assertion was tied to one of the article's earlier examples and did not match the complete example's wording. Fix: made the assertion check for scope-related error text instead of one exact phrase.

## Review Notes
- FastAPI's documented `OAuth2PasswordBearer(tokenUrl="token", scopes=...)`, `Security(...)`, `SecurityScopes.scopes`, and `SecurityScopes.scope_str` usage matches the article.
- `OAuth2PasswordRequestForm.scopes` is correctly described as being parsed from the space-delimited form field named `scope`.
- RFC 6750 supports returning required scopes in the `WWW-Authenticate` header and recommends HTTP 403 for `insufficient_scope`; the article's 403 examples are appropriate.
- The examples use `datetime.utcnow()`. This still works, but modern Python/FastAPI examples commonly prefer timezone-aware UTC datetimes, such as `datetime.now(timezone.utc)`, for JWT expiration values.
- The local workspace does not have FastAPI, python-jose, or passlib installed, so runtime execution of the complete example was not possible here. Python fenced code blocks were checked for syntax with `ast.parse`.
