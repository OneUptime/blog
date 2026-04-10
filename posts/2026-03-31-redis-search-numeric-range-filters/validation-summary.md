# Validation Summary: How to Use Numeric Range Filters in Redis Search

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis
- RediSearch (Redis Search module)
- FT.CREATE, FT.SEARCH, FT.AGGREGATE commands
- NUMERIC, TAG, and TEXT field types
- SORTABLE and NOINDEX field options

## Sources Consulted
- Official Redis documentation on FT.SEARCH numeric filters (https://redis.io/docs/latest/develop/interact/search-and-query/query/range/)
- Official Redis documentation on FT.CREATE (https://redis.io/docs/latest/commands/ft.create/)
- Official Redis documentation on FT.AGGREGATE (https://redis.io/docs/latest/commands/ft.aggregate/)
- Official Redis documentation on combined queries (https://redis.io/docs/latest/develop/interact/search-and-query/query/combined/)
- RediSearch source code (`src/numeric_index.h`) for range tree implementation details

## Issues Found
No technical issues found.

## Review Notes
- The output examples in the post are simplified to show only the relevant field (e.g., only "price" in range query results) rather than the full hash contents that FT.SEARCH returns by default. This is a common and acceptable convention for tutorial readability.
- The NOINDEX section states that "NOINDEX fields are stored for RETURN but not added to the range index." This is practically correct — the hash document still holds the field data and it can be returned. However, per the official docs, NOINDEX without SORTABLE means the field is "just ignored by the index," meaning it is neither indexed for search nor stored in a sort vector. The field is still accessible via RETURN because RETURN reads from the underlying hash document, not the index. A more precise phrasing would note this distinction, but the current description is not incorrect for practical purposes.
- The Exclusive Bounds example uses `@price:[0 (30]` to demonstrate "strictly less than $30," which implicitly adds a lower bound of 0. Using `@price:[-inf (30]` would be more idiomatic for an unbounded "less than" query, though the result is correct for the given dataset.
