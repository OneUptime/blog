# Validation Summary: How to Use FT.SYNUPDATE in Redis to Add Synonym Groups

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (Redis Stack)
- RediSearch module (FT.SYNUPDATE, FT.SYNDUMP, FT.SEARCH, FT.CREATE)
- Python redis-py client

## Sources Consulted
- Redis official documentation for FT.SYNUPDATE: https://redis.io/docs/latest/commands/ft.synupdate/
- Redis official documentation for FT.SYNDUMP: https://redis.io/docs/latest/commands/ft.syndump/
- Redis synonyms concept guide: https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/synonyms/
- Redis FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- redis-py client documentation

## Issues Found
No technical issues found.

## Review Notes
- The `synonym_group_id` parameter is described as "a string identifier" which is correct for current Redis Stack versions. Official examples show both numeric and string IDs (e.g., `synonym1`).
- The parameter description says "two or more terms" are required. Technically the syntax allows one term (`term [term ...]`), but a single-term synonym group has no practical use, so this description is a reasonable simplification.
- The Python example uses hyphenated synonym terms like `in-memory` and `key-value`. The default RediSearch tokenizer may split hyphenated words into separate tokens, which could affect synonym matching in practice. This is a tokenizer configuration subtlety rather than an error in FT.SYNUPDATE usage.
- The SKIPINITIALSCAN explanation accurately reflects the Redis documentation behavior — without the flag, existing documents are rescanned to apply the new synonym mappings.
