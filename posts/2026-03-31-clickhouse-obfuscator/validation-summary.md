# Validation Summary: How to Use clickhouse-obfuscator for Data Anonymization

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- clickhouse-obfuscator CLI utility
- Data anonymization / obfuscation
- Native and TSV data formats

## Sources Consulted
- ClickHouse official documentation: https://clickhouse.com/docs/en/operations/utilities/clickhouse-obfuscator
- ClickHouse source code: `programs/obfuscator/Obfuscator.cpp` (model factory, CLI flag definitions, per-type obfuscation models)
- ClickHouse GitHub issues (e.g., #66615 — request for column exclusion feature, confirming it does not exist)

## Issues Found

1. **`--table` flag does not exist (critical)**: The blog used `--table orders` in the "Basic Workflow" and "Obfuscating Multiple Tables" examples. This flag is not a valid clickhouse-obfuscator option. Removed from all examples. When using Native format, schema information is embedded in the data, so no table name is needed.

2. **Seed values too short**: Examples used `--seed 42`, `--seed 999`, and `--seed 12345`. The official documentation requires the seed to be an arbitrary string of at least 10 bytes. Changed all seed values to `'my_secret_seed_value'` and added a note about the minimum length requirement.

3. **Date type obfuscation claim was wrong**: The blog claimed Date columns produce "Random date in similar range." In reality, Date values use `IdentityModel` and pass through completely unchanged. Corrected the table entry.

4. **DateTime type obfuscation claim was wrong**: The blog claimed DateTime columns produce "Random date in similar range." In reality, the date part is preserved as-is and only the time-of-day component is permuted. Corrected the table entry.

5. **Enum type is not supported**: The blog claimed Enum produces "Random valid enum value." In reality, Enum types throw an `NOT_IMPLEMENTED` exception. Removed from the table.

6. **LowCardinality(String) is not supported**: The blog claimed it produces "Random value from same set." In reality, LowCardinality types are not handled and throw an unsupported type error. Removed from the table.

7. **IPv4/IPv6 types are not supported**: The blog claimed they produce "Random IP address." In reality, these types are not handled by the obfuscator. Removed from the table.

8. **String obfuscation description was oversimplified**: The blog described it as "Random string of same byte length, same character class." In reality, clickhouse-obfuscator uses a trained Markov model that preserves length distribution and character transition probabilities. Updated the description in the table, introduction, and summary.

9. **Integer obfuscation description was imprecise**: Changed from "Random value in similar numeric range" to "Pseudorandom permutation within the same order of magnitude (log2 class); 0 and 1 are preserved."

10. **Float obfuscation description was imprecise**: Changed from "Random value with similar magnitude" to "Mantissa is permuted while sign and exponent (magnitude) are preserved."

11. **FixedString description was inaccurate**: Changed from "Random N-byte string" to "N-byte string with word characters preserved in their class."

12. **"Obfuscating Specific Columns Only" section was misleading**: The original suggested exporting all columns (including `order_id`) and piping through the obfuscator with a comment saying `order_id` would be "kept as-is." This is incorrect — the obfuscator transforms ALL columns in its input. Rewrote the section to correctly show the approach: export sensitive columns separately, obfuscate them, then combine with non-sensitive columns using `paste`.

## Review Notes
- The obfuscator does not support all ClickHouse types. Types like Enum, LowCardinality, IPv4, IPv6, Array, Tuple, Map, and Nullable are not supported and will throw errors. Users working with these types would need to cast or exclude them before obfuscation.
- The Date type passing through unchanged is a notable limitation for GDPR compliance — if dates themselves are considered sensitive, users must handle Date anonymization separately.
- The `--save` and `--load` flags allow persisting trained Markov models for reuse across runs, which could be useful for large-scale workflows but is not covered in this post.
- The Markov model order (default 5) and other tuning parameters (`--frequency-cutoff`, `--num-buckets-cutoff`, etc.) are available for advanced use but not covered here.
