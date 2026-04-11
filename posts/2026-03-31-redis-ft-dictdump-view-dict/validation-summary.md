# Validation Summary: How to Use FT.DICTDUMP in Redis to View Custom Dictionaries

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RediSearch (FT.DICTDUMP, FT.DICTADD, FT.DICTDEL, FT.SPELLCHECK, FT.SYNDUMP)

## Sources Consulted
- Redis official documentation for FT.DICTDUMP: https://redis.io/docs/latest/commands/ft.dictdump/
- Redis official documentation for FT.DICTADD: https://redis.io/docs/latest/commands/ft.dictadd/
- Redis official documentation for FT.DICTDEL: https://redis.io/docs/latest/commands/ft.dictdel/
- Redis official documentation for FT.SPELLCHECK: https://redis.io/docs/latest/commands/ft.spellcheck/
- Redis official documentation for FT.SYNDUMP: https://redis.io/docs/latest/commands/ft.syndump/

## Issues Found

### 1. False claim that FT.DICTDUMP returns terms in alphabetical order
- **What was wrong:** The post stated multiple times that FT.DICTDUMP returns terms "in alphabetical order." The official Redis documentation does not guarantee any ordering — it only states the return value is "Array of dictionary terms" (RESP2) or "Set of dictionary terms" (RESP3). The official docs example itself shows terms in non-alphabetical order.
- **What was changed:** Removed "in alphabetical order" from the syntax description (line 35), the summary section, and the mermaid diagram label ("Returns sorted array" changed to "Returns array"). Removed the standalone line "Terms are returned in alphabetical order."
- **Why:** Making an ordering guarantee that the official documentation does not support could lead readers to write code that depends on this ordering, which may break in future Redis versions.

### 2. Incorrect example output order
- **What was wrong:** The first example output showed `"redistimeseries"` (item 3) before `"redisearch"` (item 4), which is not even alphabetical order (since `redisearch` < `redistimeseries` lexicographically). This was internally inconsistent with the post's own alphabetical ordering claim.
- **What was changed:** Reordered the example output to show `"redisearch"` before `"redistimeseries"` to be at least a plausible output order.
- **Why:** The original output was inconsistent regardless of what ordering scheme is used.

## Review Notes
- The claim that FT.DICTDUMP returns an empty array for non-existent dictionaries is not explicitly documented in the official Redis docs, but is also not contradicted. This is a reasonable practical observation and was left as-is.
- The FT.DICTADD, FT.DICTDEL, and FT.SPELLCHECK syntax and usage described in the post are all correct per official documentation.
- The comparison between FT.DICTDUMP and FT.SYNDUMP is accurate — dictionaries are for spellcheck inclusion/exclusion, synonym groups are for query expansion.
- While RediSearch internally uses a trie data structure for dictionaries (which would naturally produce lexicographic ordering during iteration), this is an implementation detail, not a documented contract. The post was corrected to avoid stating this as a guarantee.
