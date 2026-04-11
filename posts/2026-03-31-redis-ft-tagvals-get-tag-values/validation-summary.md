# Validation Summary: How to Use FT.TAGVALS in Redis to Get All Tag Values

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RediSearch (FT.TAGVALS, FT.CREATE, FT.SEARCH, FT.AGGREGATE)
- TAG field type and SEPARATOR option

## Sources Consulted
- Official Redis FT.TAGVALS documentation: https://redis.io/docs/latest/commands/ft.tagvals/
- Official Redis FT.CREATE documentation: https://redis.io/docs/latest/commands/ft.create/
- Official Redis FT.SEARCH documentation: https://redis.io/docs/latest/commands/ft.search/
- Official Redis FT.AGGREGATE documentation: https://redis.io/docs/latest/commands/ft.aggregate/
- Official Redis tags documentation: https://redis.io/docs/latest/develop/interact/search-and-query/advanced-concepts/tags/

## Issues Found
1. **Incorrect claim: values returned in alphabetical order** — The blog stated in three places (line 81, line 144, line 169) that FT.TAGVALS returns values in alphabetical order. The official Redis documentation explicitly states: "FT.TAGVALS provides no paging or sorting, and the tags are not alphabetically sorted." Fixed all three occurrences:
   - Line 81: "Values are returned in alphabetical order." -> "Values are returned in no guaranteed order."
   - Line 144: "Values are returned in alphabetical order, not by frequency" -> "Values are returned in no guaranteed order (not sorted alphabetically or by frequency)"
   - Line 169: "Results are sorted alphabetically and reflect the current state of the index." -> "Results are returned in no guaranteed order and reflect the current state of the index."

## Review Notes
- The `SEPARATOR ","` on the `tags` TAG field is redundant since comma is the default separator for hash documents. This is not technically wrong, just unnecessary. Left as-is since it improves readability by making the separator explicit.
- The claim that deleted document tags persist until garbage collection (line 148) is consistent with RediSearch's known soft-delete architecture but is not explicitly documented on the FT.TAGVALS documentation page. Left as-is since it reflects real behavior.
- The example output for FT.TAGVALS commands may happen to appear sorted in practice for small datasets, but the order is not guaranteed by the API contract. Readers should be aware that real output ordering may vary.
