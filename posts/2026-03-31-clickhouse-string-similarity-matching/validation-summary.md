# Validation Summary: How to Implement String Similarity Matching in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- ClickHouse string similarity functions (ngramDistance, ngramSearch, ngramDistanceCaseInsensitive)
- ClickHouse editDistance (Levenshtein distance)

## Sources Consulted
- ClickHouse official documentation: String Similarity Functions (https://clickhouse.com/docs/en/sql-reference/functions/string-similarity-functions)
- ClickHouse official documentation: String Functions (https://clickhouse.com/docs/en/sql-reference/functions/string-functions)
- ClickHouse source code (FunctionsStringSimilarity.cpp) for ngramSearch return type verification

## Issues Found

1. **Incorrect description of ngramDistance algorithm (line 17):** The post described ngramDistance as computing a "normalized edit distance based on character n-grams." This is wrong — edit distance (Levenshtein) is a fundamentally different algorithm that counts character insertions, deletions, and substitutions. ngramDistance actually computes the symmetric difference between two multisets of 4-character n-grams, normalized by the sum of their cardinalities. Fixed to: "computes a normalized distance based on the symmetric difference of 4-character n-gram multisets."

2. **Description mentions soundex but post never uses it (line 7):** The post description claimed coverage of "ngramDistance, editDistance, and soundex" but soundex was never demonstrated anywhere in the post. The post actually covers ngramSearch extensively. Fixed the description to reference ngramSearch instead of soundex.

3. **Misleading column alias in duplicate detection example (line 93):** The column was aliased as `similarity` but the value comes from `ngramDistance`, which is a distance metric (0 = identical, 1 = completely different) — not a similarity score. This is semantically inverted and would confuse readers. Changed the alias to `dist` for consistency with other ngramDistance examples in the post.

## Review Notes
- The ngramSearch function's return type has a known documentation inconsistency in official ClickHouse docs. The current docs claim UInt8, but the source code uses Float32 and older documentation explicitly describes it as returning a float in [0, 1]. The blog's usage (comparing with `> 0.5`) is correct based on actual behavior.
- The editDistance function operates on byte strings, not UTF-8 codepoints. This distinction matters for multibyte characters but is a minor nuance not worth correcting in a general tutorial.
- All SQL examples are syntactically correct and use valid ClickHouse function signatures.
