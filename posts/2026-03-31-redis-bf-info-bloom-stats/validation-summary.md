# Validation Summary: How to Use BF.INFO in Redis to Get Bloom Filter Stats

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis
- RedisBloom module
- Bloom filter probabilistic data structure
- BF.INFO, BF.ADD, BF.MADD, BF.RESERVE commands

## Sources Consulted
- Redis official documentation for BF.INFO: https://redis.io/docs/latest/commands/bf.info/
- Redis official documentation for BF.ADD: https://redis.io/docs/latest/commands/bf.add/
- Redis official documentation for BF.MADD: https://redis.io/docs/latest/commands/bf.madd/
- Redis official documentation for BF.RESERVE: https://redis.io/docs/latest/commands/bf.reserve/

## Issues Found

1. **BF.ADD used with multiple items (Critical)**: Line 40 used `BF.ADD simple_filter "item1" "item2" "item3"`. `BF.ADD` only accepts a single item per call. Changed to `BF.MADD` which is the correct command for adding multiple items at once.

2. **Incorrect fields listed in introductory description (High)**: The opening paragraph claimed BF.INFO returns "error rate", "number of bits in the bit array", and "number of hash functions". BF.INFO does not return any of these fields. It returns: Capacity, Size, Number of filters, Number of items inserted, and Expansion rate. Corrected the description to list the actual fields.

3. **Description metadata mentioned "error rate" (Medium)**: The post's Description metadata said BF.INFO retrieves "error rate" — it does not. Changed to "expansion rate".

4. **Syntax section incomplete (Medium)**: The syntax only showed `BF.INFO key` but omitted the optional single-field sub-commands (`CAPACITY | SIZE | FILTERS | ITEMS | EXPANSION`). Added the optional parameters and a note about their usage.

## Review Notes
- The example output values (capacity 100 for auto-created filters, expansion rate 2 as default) are consistent with official documentation.
- The expanded filter example (capacity 10, expanding to 30 with 2 sub-filters after adding 13 items) is plausible and consistent with the documented expansion behavior.
- The monitoring workflow and capacity planning sections provide practical, accurate guidance.
- The "Capacity" field description in the table says "Total number of elements the filter can hold before the false positive rate degrades" — the official docs describe it as "number of unique items that can be stored before scaling is required." These are subtly different but the blog's wording is acceptable for a tutorial context since scaling exists precisely to prevent FP rate degradation.
