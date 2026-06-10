# Validation Summary: How to Handle Database Transactions in Django

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Python
- Django (transaction API: `transaction.atomic`, `on_commit`, `savepoint`, `non_atomic_requests`, `ATOMIC_REQUESTS`)
- PostgreSQL (isolation levels, `SELECT ... FOR UPDATE`, `skip_locked`, `nowait`)
- psycopg (via `django.db.backends.postgresql.psycopg_any.IsolationLevel`)
- Django test framework (`TestCase`, `TransactionTestCase`)

## Sources Consulted
- Django docs — Database transactions: https://docs.djangoproject.com/en/stable/topics/db/transactions/
- Django docs — Databases (PostgreSQL `isolation_level` option): https://docs.djangoproject.com/en/stable/ref/databases/
- Django docs — `QuerySet.select_for_update()` (`skip_locked`, `nowait`, `of`): https://docs.djangoproject.com/en/stable/ref/models/querysets/#select-for-update
- Django docs — Testing tools (`TransactionTestCase`): https://docs.djangoproject.com/en/stable/topics/testing/tools/
- PostgreSQL docs — `SET TRANSACTION`: https://www.postgresql.org/docs/current/sql-set-transaction.html

## Issues Found
1. **Incorrect `isolation_level` value in `settings.py` example.** The post passed a string (`'read committed'`) to `OPTIONS['isolation_level']` for the PostgreSQL backend. Django expects a constant from `django.db.backends.postgresql.psycopg_any.IsolationLevel` (or the underlying psycopg/psycopg2 constants); a plain string will not work. Fixed by importing `IsolationLevel` and using `IsolationLevel.READ_COMMITTED`, and updating the comment to list the enum member names.
2. **`SET TRANSACTION ISOLATION LEVEL` was executed outside the transaction.** The `serializable_transaction()` example issued `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` from a cursor opened *before* the `transaction.atomic()` block. `SET TRANSACTION` in PostgreSQL only affects the current transaction and must be issued inside it before any data access, so this code would not actually run the subsequent atomic block at SERIALIZABLE isolation. Moved the cursor into the `atomic()` block (executed first), added `transaction` to the import line, and added an inline note explaining the requirement.

## Review Notes
- The rest of the code is consistent with the current Django transaction API: `transaction.atomic()` as both context manager and decorator, nested `atomic()` creating savepoints, `transaction.savepoint()` / `savepoint_commit()` / `savepoint_rollback()`, `on_commit(func, using=...)`, `select_for_update(skip_locked=..., nowait=..., of=('self',))`, `ATOMIC_REQUESTS`, and `@transaction.non_atomic_requests`.
- The post correctly notes that `skip_locked` / `nowait` are PostgreSQL/Oracle-only and that `TransactionTestCase` (rather than `TestCase`) is needed to exercise real commit/rollback behavior — including the fact that `on_commit` hooks won't fire under `TestCase` because the outer wrapping transaction never commits.
- Minor stylistic observation (not an error): some snippets reference `logger` without re-importing it, on the assumption that the reader keeps prior imports from earlier snippets in the same `myapp/services.py` file. Not corrected because the post uses `# myapp/services.py` headers to signal a shared file context.
- The `with_retry` decorator example is a reasonable illustration but relies on string-matching `'deadlock'`/`'lock'` in the exception message, which is driver-dependent. Acceptable for an illustrative example; production code typically inspects PostgreSQL `SQLSTATE` (`40001`/`40P01`) instead. Left as-is since the post frames it as a pattern, not a recommendation to ship verbatim.
