# Validation Summary: How to Build GraphQL APIs with Strawberry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Strawberry GraphQL (Python)
- Python 3.11+ (type hints, dataclasses, async/await)
- FastAPI
- GraphQL (queries, mutations, subscriptions, interfaces, enums, input types)
- DataLoaders (N+1 prevention)
- SQLAlchemy-style ORM (used illustratively in examples)
- bcrypt (password hashing)
- pytest / pytest-asyncio (testing)
- WebSocket subscription protocols (graphql-transport-ws, graphql-ws)
- Docker (deployment example)
- uvicorn (ASGI server)

## Sources Consulted
- Strawberry GraphQL official documentation — https://strawberry.rocks/docs
- Strawberry FastAPI integration docs — https://strawberry.rocks/docs/integrations/fastapi
- Strawberry interfaces docs — https://strawberry.rocks/docs/types/interfaces
- Strawberry DataLoader docs — https://strawberry.rocks/docs/guides/dataloaders
- Strawberry permission/authorization docs — https://strawberry.rocks/docs/guides/permissions
- Strawberry subscriptions docs — https://strawberry.rocks/docs/general/subscriptions
- Strawberry extensions / schema extensions docs — https://strawberry.rocks/docs/guides/custom-extensions
- Python dataclasses documentation — https://docs.python.org/3/library/dataclasses.html
- FastAPI documentation — https://fastapi.tiangolo.com
- bcrypt library — https://pypi.org/project/bcrypt/

## Issues Found
- **Field ordering in `Post` and `Comment` types (Interface Types section)**: The original code declared `updated_at: Optional[datetime] = None` (a field with a default) before fields without defaults (`author_id`, `post_id`). Because `@strawberry.type` is built on top of `dataclasses.dataclass`, this raises `TypeError: non-default argument 'author_id' follows default argument` at class definition time. Fixed by moving the fields without defaults (`author_id`, `post_id`) before `updated_at` in both `Post` and `Comment` declarations so the dataclass field ordering rule is satisfied.

## Review Notes
- The Strawberry Extension class API shown (`Extension`, `on_request_start`, `on_request_end`, `on_validation_end`) reflects the older synchronous hook API. In modern Strawberry versions (~0.130+), the recommended class has been renamed to `SchemaExtension` and lifecycle hooks were refactored into async-generator style hooks (`on_operation`, `on_validate`, `on_parse`, `on_execute`). The older API still works for backward compatibility, so the examples are not broken — but readers using the latest Strawberry should consult the docs and consider migrating to `SchemaExtension` with the newer hooks.
- Several example modules use `from types.user import ...`, `from types.inputs import ...`, etc. The package name `types` shadows Python's standard-library `types` module. This is a common tutorial convention and works when the project root is on `sys.path`, but in a real project it can cause subtle import conflicts. Renaming the package (e.g. `app_types/` or `gql_types/`) is safer; left unchanged since it's stylistic and the broader pattern is widely seen in tutorials.
- `datetime.utcnow()` is used throughout. It is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. Functionality still works, but readers targeting 3.12+ may want to migrate.
- The `graphiql=...` parameter on `GraphQLRouter` is still supported but is being superseded by `graphql_ide=...` in newer Strawberry versions. Both work today.
- Subscription protocol imports (`GRAPHQL_TRANSPORT_WS_PROTOCOL`, `GRAPHQL_WS_PROTOCOL` from `strawberry.subscriptions`) and security extensions (`QueryDepthLimiter`, `MaxAliasesLimiter` from `strawberry.extensions`) are accurate.
- The `strawberry.UNSET` sentinel and the `is not strawberry.UNSET` check for distinguishing "explicitly null" vs "not provided" in partial updates is correct.
- The `BasePermission` API from `strawberry.permission` with `has_permission(self, source, info, **kwargs) -> bool` matches the official permission class signature.
- The DataLoader usage from `strawberry.dataloader.DataLoader` with `load_fn=...` and `await loader.load(key)` is correct.
- The Schema-time docstring-as-description behavior (mentioned for `@strawberry.type` classes) is accurate.
