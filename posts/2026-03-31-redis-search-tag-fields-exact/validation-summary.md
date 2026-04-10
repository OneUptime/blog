# Validation Summary: How to Use Tag Fields in Redis Search for Exact Matching

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- Redis
- RediSearch (Redis Search module)
- FT.CREATE, FT.SEARCH, FT.TAGVALS commands

## Sources Consulted
- Redis Search official documentation for TAG field type (https://redis.io/docs/latest/develop/interact/search-and-query/basic-constructs/field-and-type-options/#tag-fields)
- Redis Search query syntax documentation (https://redis.io/docs/latest/develop/interact/search-and-query/query/)
- FT.CREATE command reference (https://redis.io/docs/latest/commands/ft.create/)
- FT.SEARCH command reference (https://redis.io/docs/latest/commands/ft.search/)
- FT.TAGVALS command reference (https://redis.io/docs/latest/commands/ft.tagvals/)

## Issues Found
1. **Mermaid diagram: incorrect OR syntax for tag query** - The diagram showed `@tags:{redis,database}` as an example tag query, but commas are not the OR operator in RediSearch tag queries. Commas are separator characters (used in stored data, not queries) and are listed as special characters requiring escaping. The correct OR syntax uses the pipe operator: `@tags:{redis | database}`. This was inconsistent with the rest of the article, which correctly uses `|` for OR throughout. Fixed to `@tags:{redis | database}`.

## Review Notes
- The FT.SEARCH output examples are simplified (omitting the field-value pairs returned for each document). This is acceptable for tutorial clarity but readers should be aware that actual output includes all hash fields. Adding `NOCONTENT` to the queries would make the shown output exactly match real output.
- The "Combine TAG with NUMERIC Filter" example references a `price` field not defined in the sample index/data. This is fine as a conceptual example but cannot be run against the sample dataset as-is.
- All query result counts were verified against the sample data and are correct.
- The special characters escaping list is comprehensive and accurate.
- TAG vs TEXT comparison table provides sound guidance.
