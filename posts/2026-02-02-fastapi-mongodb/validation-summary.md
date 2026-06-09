# Validation Summary: How to Use MongoDB with FastAPI

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- FastAPI (lifespan events, dependency injection, routers, response models)
- Motor (async MongoDB driver, `AsyncIOMotorClient`, sessions/transactions)
- MongoDB (CRUD, aggregation pipelines, text search, indexes, multi-document transactions)
- Pydantic v2 (`BaseModel`, `ConfigDict`, `Field`, `EmailStr`)
- pydantic-settings (`BaseSettings`, `SettingsConfigDict`)
- PyMongo (`UpdateOne`, `DuplicateKeyError`, bulk writes, connection pool/compression options)
- bson (`ObjectId`)
- pytest / pytest-asyncio
- httpx (`AsyncClient`, `ASGITransport`)
- Docker / docker-compose

## Sources Consulted
- Pydantic v2 custom types docs — https://docs.pydantic.dev/latest/concepts/types/
- pydantic-settings v2 docs — https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- MongoDB FastAPI + Motor quickstart — https://www.mongodb.com/developer/languages/python/python-quickstart-fastapi/
- PyMongo network compression options — https://www.mongodb.com/docs/languages/python/pymongo-driver/current/connect/connection-options/network-compression/
- PyMongo `MongoClient` API reference — https://pymongo.readthedocs.io/en/stable/api/pymongo/mongo_client.html
- httpx `ASGITransport` docs — https://www.python-httpx.org/advanced/transports/
- httpx issue tracking the removal of the `app=` shortcut — https://github.com/encode/httpx/issues/3111
- FastAPI lifespan docs — https://fastapi.tiangolo.com/advanced/events/

## Issues Found
1. **`PyObjectId` used the deprecated Pydantic v1 `__get_validators__` pattern.** Pydantic v2 removed this hook in favor of `__get_pydantic_core_schema__`. The `validate(cls, v, handler)` signature in the post was also a mismatched hybrid that would not work in either v1 or v2. Replaced the custom `class PyObjectId(str)` with the canonical Pydantic v2 idiom recommended by MongoDB's official FastAPI quickstart: `PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]`.
2. **`UserResponse.id` was typed `str` but populated from MongoDB's `ObjectId`,** which would raise a validation error in Pydantic v2 (ObjectId is not a string subtype). Changed it to `PyObjectId` so the `BeforeValidator` converts ObjectId → str. Also added missing `= None` defaults to `Optional[...]` fields, which are required in Pydantic v2 to make those fields actually optional, and added the missing `ConfigDict` import.
3. **`compressors=["zstd", "snappy", "zlib"]` is not the documented form for PyMongo/Motor.** The driver expects a comma-separated string per the PyMongo network-compression docs. Changed to `compressors="zstd,snappy,zlib"`.
4. **`httpx.AsyncClient(app=app, base_url=...)` no longer works in httpx 0.28+.** The `app=` shortcut was removed; transports must be passed explicitly. Switched to `AsyncClient(transport=ASGITransport(app=app), base_url=...)` and added the `ASGITransport` import.
5. **`class Config: env_file = ".env"` inside `BaseSettings` is the Pydantic v1 pattern.** pydantic-settings v2 documents `model_config = SettingsConfigDict(...)`. Migrated the config block and added the `SettingsConfigDict` import.
6. **Empty `class Config: collection = "users"` on the `User` model did nothing in Pydantic v2.** Pydantic has no concept of a MongoDB collection name; this was dead code that could mislead readers. Removed the inner `Config` block and left a one-line comment noting collections are addressed at the service layer (which is what the post already does in `UserService.__init__`).

## Review Notes
- `datetime.utcnow()` is used throughout. It's functional but emits a `DeprecationWarning` on Python 3.12+. The modern replacement is `datetime.now(timezone.utc)`. Left unchanged because (a) the post is consistent and (b) it's still working code; flagging here for a future refresh.
- The custom `event_loop` session-scoped fixture in `tests/conftest.py` is the legacy pytest-asyncio pattern; pytest-asyncio 0.23+ deprecated it in favor of `asyncio_mode = "auto"` plus the built-in fixture. Still works on current versions but will need replacing eventually.
- `httpx.AsyncClient` with `ASGITransport` does **not** trigger FastAPI lifespan events automatically. The tests in the post override the DB dependency directly, so they don't rely on the lifespan handler — that's fine, but worth flagging if a reader copies the fixture and expects startup hooks to run.
- The `_hash_password` helper uses SHA-256. The post explicitly tells readers to use bcrypt/argon2 in production, so this is acceptable for a tutorial.
- The aggregation pipelines, transaction example, index definitions, bulk-write usage, and Docker setup were all reviewed and are syntactically and semantically correct against current MongoDB / PyMongo / Motor docs.
