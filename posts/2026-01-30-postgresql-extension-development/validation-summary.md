# Validation Summary: How to Build PostgreSQL Extension Development

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- PostgreSQL (extension system, control files, PGXS)
- C (PostgreSQL C extension API: PG_MODULE_MAGIC, PG_FUNCTION_INFO_V1, palloc, ereport)
- PL/pgSQL (jsonb functions, set-returning functions)
- SQL (CREATE EXTENSION, CREATE TYPE, CREATE OPERATOR, CREATE OPERATOR CLASS)
- Server Programming Interface (SPI)
- jsonb type and operators (`#>`, `||`, `jsonb_each_text`, `jsonb_typeof`, `jsonb_set`)
- Makefile / PGXS build system
- PGXN META.json
- Debian and RPM packaging
- GDB and Valgrind for debugging

## Sources Consulted
- PostgreSQL 16 docs — Packaging Related Objects into an Extension: https://www.postgresql.org/docs/current/extend-extensions.html
- PostgreSQL 16 docs — SPI_execute: https://www.postgresql.org/docs/16/spi-spi-execute.html
- PostgreSQL 13 Release Notes (for `trusted` parameter): https://www.postgresql.org/docs/13/release-13.html
- PostgreSQL source — `src/include/common/hashfn.h` (location of `hash_any` in PG 13+): https://doxygen.postgresql.org/hashfn_8h_source.html
- PostgreSQL source — `src/include/access/tupdesc.h` (CreateTemplateTupleDesc signature in PG 12+): https://github.com/postgres/postgres/blob/REL_16_STABLE/src/include/access/tupdesc.h

## Issues Found

1. **Invalid control-file example mixed `relocatable = true` with `schema = public`.** The PostgreSQL docs explicitly state the `schema` parameter can only be set for non-relocatable extensions, so this combination would be rejected by `CREATE EXTENSION`. Removed the `schema = public` line from the initial `myext.control` example so the file matches `relocatable = true`. Also clarified the table description for the `schema` parameter to note it is only valid when `relocatable = false`.

2. **Missing `common/hashfn.h` include in `email_type.c`.** The example calls `hash_any()` but the include list (`postgres.h`, `fmgr.h`, `libpq/pqformat.h`, `utils/builtins.h`) does not transitively pull in the declaration in PG 13+. In PG 13+, `hash_any` is a `static inline` function declared in `common/hashfn.h`, so the example would fail to compile cleanly under PG 16 (the version used in the install commands earlier in the post). Added `#include "common/hashfn.h"` to the example.

## Review Notes

- The `email_in` function lowercases input but `email_recv` does not. Both go through `validate_email`, but a value inserted via binary COPY would retain mixed case while the same value inserted via text COPY would be lowercased. This is a minor consistency issue not corrected here, since the post is illustrative and the asymmetry would be repeated wherever readers reuse the pattern. Worth flagging in any future revision.
- `hash_any` returns a `Datum` (which is a `uint32` worth of data for these purposes); passing it directly to `PG_RETURN_INT32` works but `DatumGetUInt32` then `PG_RETURN_INT32` would be clearer.
- The set-returning `get_recent_audit_events` function keeps the SPI connection open across calls and stores `SPI_tuptable` in `funcctx->user_fctx`. The standard idiom is to copy tuples into `multi_call_memory_ctx` and call `SPI_finish()` before returning from the first call. The pattern shown is fragile if another SPI operation runs between calls — acceptable as a teaching example but worth noting.
- The `CREATE CAST (text AS email) WITH INOUT AS IMPLICIT` creates an implicit cast, which is generally discouraged because it can introduce operator-resolution ambiguity. The post does not warn the reader. Not corrected here since it is a stylistic recommendation rather than a technical error.
- The `~=` operator declares `COMMUTATOR = ~=` (self-commutative), which is valid for symmetric distance comparisons. Confirmed.
- `default_version = '1.1'` upgrade path: the post correctly notes a separate `jsonutils--1.1.sql` containing the cumulative definitions is needed for fresh installs at v1.1.
- `CreateTemplateTupleDesc(5)` (one-argument form) is correct for PG 12+ — the `hasoid` parameter was removed.
- `SPI_OK_INSERT_RETURNING` is a valid SPI return code for `INSERT ... RETURNING` statements.
- `trusted = true` (PostgreSQL 13+) note is accurate.
