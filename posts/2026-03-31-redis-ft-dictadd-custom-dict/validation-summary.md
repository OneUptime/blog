# Validation Summary: How to Use FT.DICTADD in Redis to Add to Custom Dictionaries

## Status
validated

## Post Type
Tutorial / Command Reference

## Technologies Covered
- Redis
- RediSearch (FT.DICTADD, FT.SPELLCHECK, FT.DICTDUMP)

## Sources Consulted
- https://redis.io/docs/latest/commands/ft.dictadd/ — official FT.DICTADD command reference
- https://redis.io/docs/latest/commands/ft.spellcheck/ — official FT.SPELLCHECK command reference (TERMS INCLUDE/EXCLUDE semantics)
- https://redis.io/docs/latest/commands/ft.dictdump/ — official FT.DICTDUMP command reference

## Issues Found

1. **Incorrect TERMS EXCLUDE explanation**: The post originally stated that `TERMS EXCLUDE` prevents brand names from being "flagged as misspelled." Per the official Redis docs, EXCLUDE prevents dictionary terms from being *suggested as corrections* for other misspelled words — it does not prevent the terms themselves from being flagged. Fixed the explanation in the EXCLUDE example, the opening paragraph, the "Exclude List" section description, the mermaid diagram, and the summary.

2. **Misleading output explanation for EXCLUDE example**: The post said "redisbloom is excluded so no suggestions are generated for it." The empty array is because no similar terms exist in the index, not because of EXCLUDE. Fixed the explanation to accurately describe why the output appears as shown.

3. **Invalid `--` comment syntax in Redis code blocks**: Multiple code blocks used `--` as comments (SQL-style). Redis CLI does not support any comment syntax — these lines would cause errors if pasted into redis-cli. Fixed by moving comments outside the code blocks as markdown text, splitting multi-command blocks into separate code blocks.

## Review Notes
- The FT.DICTADD syntax, parameters, and return values are all correct per the official docs.
- The FT.DICTDUMP example output is plausible (terms appear alphabetically sorted).
- The DISTANCE parameter usage in FT.SPELLCHECK is valid (default 1, max 4; the post uses DISTANCE 2).
- The INCLUDE example is correct — INCLUDE adds dictionary terms as additional suggestion candidates.
- The FT.SPELLCHECK EXCLUDE example output is technically plausible but doesn't visibly demonstrate the EXCLUDE effect — the empty array for "redisbloom" would appear regardless of the EXCLUDE clause since no similar terms exist in the index. A more illustrative example would show EXCLUDE suppressing a suggestion that would otherwise appear, but this is a pedagogical choice rather than a technical error.
