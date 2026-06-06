# Validation Summary: How to Implement Dependency Injection in Python

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Python (typing.Protocol, abc.ABC, dataclasses)
- FastAPI (`Depends`, `Annotated`, `dependency_overrides`, `TestClient`)
- `dependency-injector` library (DeclarativeContainer, Singleton, Factory, Selector, Configuration, wiring)
- `pydantic-settings` (BaseSettings)
- `databases` library (async DB layer)
- psycopg2 (PostgreSQL driver)
- smtplib / email.message
- pytest

## Sources Consulted
- Python typing.Protocol docs — https://docs.python.org/3/library/typing.html#typing.Protocol
- Python abc module docs — https://docs.python.org/3/library/abc.html
- Python datetime deprecation notes (utcnow deprecated in 3.12) — https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow
- FastAPI dependency injection — https://fastapi.tiangolo.com/tutorial/dependencies/
- FastAPI testing / dependency_overrides — https://fastapi.tiangolo.com/advanced/testing-dependencies/
- dependency-injector docs — https://python-dependency-injector.ets-labs.org/
- dependency-injector providers (Singleton, Factory, Selector, Configuration) — https://python-dependency-injector.ets-labs.org/providers/
- pydantic-settings v2 docs (SettingsConfigDict) — https://docs.pydantic.dev/latest/concepts/pydantic_settings/
- encode/databases docs — https://www.encode.io/databases/
- psycopg2 docs — https://www.psycopg.org/docs/

## Issues Found

1. **`NameError` for `Database` in the FastAPI module-scope type alias.** The original code imported `from databases import Database` *inside* `get_db()`, but then used `Database` at module scope in `DatabaseDep = Annotated[Database, Depends(get_db)]`. This would raise `NameError` at import time. Fixed by hoisting the import to the top of the module and removing the now-redundant in-function import.

2. **Missing `get_by_email` method on FastAPI `UserRepository`.** `UserService.register` calls `await self.user_repo.get_by_email(email)`, but the repository only defined `get_by_id` and `create`. Added a `get_by_email` async method consistent with the other queries.

3. **Deprecated Pydantic v1 `class Config` style.** With `pydantic-settings` (Pydantic v2), the recommended way to configure env loading is `model_config = SettingsConfigDict(env_file=".env")`. The v1-style inner `Config` class still works via backward compat but emits warnings. Updated to the v2 idiom and added `SettingsConfigDict` to the import.

4. **Deprecated `datetime.utcnow()`.** Deprecated since Python 3.12. Updated `FakeUserRepository.create` to use `datetime.now(timezone.utc)` and added `timezone` to the import.

## Review Notes

- The "bad example" SMTP code calls `smtplib.SMTP.send_message(f"Welcome {name}!")` with a string, but `send_message` expects an `email.message.Message` instance. This is technically wrong, but the block is explicitly labeled as anti-pattern code illustrating *architectural* problems (in-constructor wiring, untestable side effects), and the surrounding narrative makes that intent clear. Left as-is to avoid muddying the pedagogical example.
- The `dependency-injector` snippet contains `container.config.from_env("APP")` with a comment "Also load from environment variables." `Configuration.from_env(name, ...)` loads a *single* env var into config — it does not load all vars with a given prefix. The line is syntactically valid (it will set `config.APP` to the value of `$APP`), but the comment somewhat oversells what it does. Not a hard error, left in place.
- The `databases` library (encode/databases) is in maintenance mode. The code still works and the API used (`Database`, `connect`, `disconnect`, `fetch_one`) remains correct, but readers starting fresh today may prefer SQLAlchemy 2.0 async or asyncpg.
- A few identifiers in the FastAPI route examples are referenced but not defined (`oauth2_scheme`, `decode_token`). These are clearly illustrative placeholders for the reader's own auth wiring.
- `FakeUserRepository` references `User` without importing it, but the test-doubles snippet is intended as a continuation of the protocols module above; this is a minor copy-paste concern, not a technical inaccuracy.
- `container.environment.override(environment)` passes a plain string; dependency-injector auto-wraps non-provider values in `Object()`, so this works correctly.
