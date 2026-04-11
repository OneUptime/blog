# Validation Summary: How to Use LCS in Redis to Find Longest Common Substring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Redis 7.0+ (LCS command)
- Python (redis-py client library)

## Sources Consulted
- Official Redis LCS command documentation: https://redis.io/docs/latest/commands/lcs/
- redis-py library source code for `lcs()` method signature
- Manual LCS computation (dynamic programming) to verify example outputs

## Issues Found

1. **Garbled introduction sentence (line 13):** The original text read "It computes the longest common subsequence between two strings - either provided directly as key names whose string values are compared." This implied strings could be provided directly to the command, but the LCS command only accepts key names. Fixed to: "It computes the longest common subsequence between the string values stored at two keys."

2. **Incorrect output for MINMATCHLEN without WITHMATCHLEN (lines 94-103):** The output for `LCS str1 str2 IDX MINMATCHLEN 4` incorrectly included `3) (integer) 4` (the match length) in the match entry. Match lengths are only included in the output when `WITHMATCHLEN` is explicitly specified. Removed the erroneous match length line from the output.

3. **Incorrect LCS length for doc1/doc2 example (line 129):** The blog claimed the LCS length of "the quick brown fox jumps over the lazy dog" and "the fast brown fox leaped over the sleepy dog" was 35. The actual LCS length is 32, verified via dynamic programming computation. Fixed the value from 35 to 32.

## Review Notes
- The post title says "Longest Common Substring" but the command computes the Longest Common Subsequence. The post correctly clarifies this distinction in the Note under the Introduction, so no change was made to the title. This may be intentional for SEO.
- The Python code uses `r.get("doc1")` which returns bytes in redis-py. `len()` on bytes gives the byte count, which matches Redis string length for ASCII content. This is correct for the examples shown but could be misleading for multi-byte (UTF-8) strings. Not changed since the examples use ASCII.
- The similarity score computed in the Python example will now produce a different result (~72.73%) due to the corrected LCS length of 32. The Python code itself is correct and will compute the right value at runtime.
