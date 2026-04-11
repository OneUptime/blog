# Validation Summary: How to Use FT.SPELLCHECK in Redis for Query Spell Correction

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis (with RediSearch module)
- FT.SPELLCHECK command
- FT.CREATE, HSET commands
- FT.DICTADD for custom dictionaries
- Python redis-py client library

## Sources Consulted
- Redis official documentation for FT.SPELLCHECK: https://redis.io/commands/ft.spellcheck/
- Redis official documentation for FT.DICTADD: https://redis.io/commands/ft.dictadd/
- Redis official documentation for FT.CREATE: https://redis.io/commands/ft.create/
- redis-py client library documentation: https://redis-py.readthedocs.io/

## Issues Found

1. **Incorrect syntax for multiple TERMS INCLUDE/EXCLUDE dictionaries:** The syntax block showed `[TERMS INCLUDE dict [INCLUDE dict ...]]` and `[TERMS EXCLUDE dict [EXCLUDE dict ...]]`, implying additional dictionaries only need the `INCLUDE`/`EXCLUDE` keyword. The correct syntax requires repeating the full `TERMS INCLUDE dict` or `TERMS EXCLUDE dict` clause for each dictionary. Fixed to `[TERMS INCLUDE dict [TERMS INCLUDE dict ...]]` and `[TERMS EXCLUDE dict [TERMS EXCLUDE dict ...]]`. Note: the Python code already correctly used the full clause for each dictionary.

2. **Incorrect Levenshtein distance claim:** The DISTANCE 2 example used "performnce" and claimed it was "2 edits away" from "performance". However, "performnce" is only 1 edit away (insert 'a' between 'm' and 'n'), so it would be found with the default DISTANCE 1. Changed the misspelled word to "perfomace" which is genuinely 2 edits from "performance" (missing 'r' after 'o' and missing 'n' before 'c'), making the example accurately demonstrate when DISTANCE 2 is needed.

## Review Notes
- The Python examples use `r.execute_command()` for raw command execution, which is correct but worth noting that newer versions of redis-py with RediSearch support also provide higher-level methods via `r.ft()`. The raw approach shown is valid and more portable.
- The score description ("0.0 to 1.0, higher = better suggestion") is a reasonable simplification. The actual scoring is based on normalized term frequency in the index.
- The auto-correct example using `str.replace()` is a simple approach that works for the demo but could produce unexpected results in production if a misspelled term appears as a substring of another word. This is acceptable for a tutorial.
