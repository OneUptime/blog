# Validation Summary: How to Use FT.DICTADD in Redis to Add Custom Dictionary Terms

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (FT.DICTADD, FT.DICTDUMP, FT.DICTDEL, FT.SPELLCHECK, FT.CREATE)
- Python redis-py client library

## Sources Consulted
- Official Redis documentation for FT.DICTADD: https://redis.io/docs/latest/commands/ft.dictadd/
- Official Redis documentation for FT.SPELLCHECK: https://redis.io/docs/latest/commands/ft.spellcheck/
- Official Redis documentation for FT.DICTDUMP: https://redis.io/docs/latest/commands/ft.dictdump/
- Official Redis documentation for FT.CREATE: https://redis.io/docs/latest/commands/ft.create/
- redis-py source code for SearchCommands (dict_add, dict_dump method signatures)

## Issues Found

### Issue 1: FT.SPELLCHECK missing `TERMS` keyword (3 occurrences)
- **What was wrong:** All FT.SPELLCHECK examples used `INCLUDE`/`EXCLUDE` without the required `TERMS` keyword prefix. For example, `FT.SPELLCHECK tech_docs "resdis nosql" INCLUDE products_dict` is invalid syntax.
- **What was changed:** Added the `TERMS` keyword before every `INCLUDE` and `EXCLUDE` clause. Corrected syntax: `FT.SPELLCHECK tech_docs "resdis nosql" TERMS INCLUDE products_dict`.
- **Why:** The official FT.SPELLCHECK syntax requires `TERMS INCLUDE|EXCLUDE dictionary` for each dictionary reference. Without `TERMS`, the commands would fail if copy-pasted by readers.
- **Lines affected:** Lines 73, 129-131, 142 (original numbering).

### Issue 2: Python redis-py method names incorrect (2 occurrences)
- **What was wrong:** The Python examples used `r.ft().dictadd()` and `r.ft().dictdump()` (no underscores), but the actual redis-py library methods are `dict_add()` and `dict_dump()` (snake_case).
- **What was changed:** Replaced `dictadd` with `dict_add` and `dictdump` with `dict_dump` in the bulk Python example.
- **Why:** Using the incorrect method names would raise an `AttributeError` at runtime. The redis-py library follows Python snake_case conventions for these methods.
- **Lines affected:** Lines 111, 115 (original numbering).

## Review Notes
- The Python Dictionary Management Class section uses `r.execute_command('FT.DICTADD', ...)` which is a valid low-level approach and works correctly as written, so no change was needed there.
- The FT.DICTDUMP output ordering shown in the blog may not match actual Redis output order (dictionaries may not preserve insertion order), but this is a minor presentation detail, not a technical error.
- The FT.CREATE syntax used is correct but uses the older `SCHEMA` keyword format. This remains valid in current Redis versions.
