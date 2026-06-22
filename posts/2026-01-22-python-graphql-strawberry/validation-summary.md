# Validation Summary: How to Build GraphQL APIs with Strawberry in Python

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- GraphQL
- Strawberry GraphQL
- FastAPI
- Flask integration package
- Strawberry DataLoader
- Strawberry subscriptions
- Strawberry permissions
- Pydantic v2 validation

## Sources Consulted
- Strawberry GraphQL scalar documentation: https://strawberry.rocks/docs/types/scalars
- Strawberry GraphQL Pydantic integration documentation: https://strawberry.rocks/docs/integrations/pydantic
- Strawberry GraphQL FastAPI integration documentation: https://strawberry.rocks/docs/integrations/fastapi
- Strawberry GraphQL permissions guide: https://strawberry.rocks/docs/guides/permissions
- Strawberry GraphQL DataLoaders guide: https://strawberry.rocks/docs/guides/dataloaders
- Strawberry GraphQL Flask integration documentation: https://strawberry.rocks/docs/integrations/flask
- Strawberry GraphQL subscriptions documentation: https://strawberry.rocks/docs/general/subscriptions
- Pydantic validator documentation: https://pydantic.dev/docs/validation/latest/concepts/validators/
- FastAPI CORS documentation: https://fastapi.tiangolo.com/tutorial/cors/
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The introductory claim said Strawberry catches errors at development time rather than runtime. Adjusted it to say Strawberry works with static type checkers and validates schemas at schema creation, which is more accurate.
- The first schema and complete app examples used `datetime.utcnow()`, which is deprecated in current Python versions because it returns a naive datetime. Replaced those calls with `datetime.now(timezone.utc)`.
- The mutation snippet created `strawberry.Schema(query=Query, mutation=Mutation)` without importing `Query`. Added the missing import from `schema`.
- The subscription snippet created a schema with `Query` and `Mutation` without importing them. Added the missing imports.
- The subscription example said a single `asyncio.Queue` publishes to all subscribers, but a single queue item is consumed by one waiter. Changed the wording to publish to the queue and corrected the timeout comment so it does not claim to send a heartbeat.
- The FastAPI example used `GraphQLRouter(..., graphiql=True)`, which is no longer a valid current constructor argument. Replaced it with `graphql_ide="graphiql"`.
- The authorization example used `permission_classes=[HasRole("admin")]`, but `permission_classes` expects permission classes and calls each entry. Replaced parameterized and non-parameterized permission usage with `PermissionExtension(permissions=[...])`.
- The custom scalar example used class decorators for scalars, which failed against the current Strawberry package during runtime validation. Reworked it to use `NewType` plus `StrawberryConfig.scalar_map`, matching current documentation.
- The Pydantic input example used `@strawberry.experimental.pydantic.input(model=BookInputModel)` with an empty class, which raises `MissingFieldsListError`. Added `all_fields=True`.
- The Pydantic section claimed validation was applied automatically. Strawberry's docs state Pydantic validation runs when converting with `to_pydantic()`, so the mutation now calls `input.to_pydantic()`.
- The complete example's `Post.author` resolver used `info.context["user_loader"]`, but the example never configured a DataLoader in context. Changed it to resolve from the in-memory store used by the rest of the example.

## Review Notes
The edited Python snippets were extracted and checked with `py_compile`, then imported successfully against Strawberry 0.316.0 installed in a temporary `/tmp` target. The examples are still demonstration code using in-memory dictionaries and permissive CORS, which is acceptable for a tutorial but should be tightened for production.
