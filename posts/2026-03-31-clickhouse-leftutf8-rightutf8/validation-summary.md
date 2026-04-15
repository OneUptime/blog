# Validation Summary: How to Use leftUTF8() and rightUTF8() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (string functions)
- UTF-8 encoding
- SQL

## Sources Consulted
- ClickHouse official documentation: String Functions — https://clickhouse.com/docs/sql-reference/functions/string-functions
- ClickHouse GitHub PR #33407 (added left/right/leftUTF8/rightUTF8 functions) — https://github.com/ClickHouse/ClickHouse/pull/33407
- UTF-8 encoding specification (byte lengths for Cyrillic characters: 2 bytes per code point in the U+0400–U+04FF range)

## Issues Found

### Issue 1: Incorrect output for `left('Привет', 3)` example
- **What was wrong:** The blog showed `left('Привет', 3)` returning `При` (3 Cyrillic characters / 6 bytes). Since `left()` operates on bytes, taking 3 bytes from a string where each Cyrillic character is 2 bytes yields П (2 bytes) plus one leading byte of р — a broken UTF-8 sequence, not three complete characters. The accompanying narrative incorrectly stated it "happens to land on a character boundary" (3 is not a multiple of 2).
- **What was changed:** Fixed the output to show `П�` (broken output), rewrote the comment and explanation to correctly describe the byte-level behavior.
- **Why:** The original output contradicted the post's own premise that `left()` is byte-based. 3 bytes from 2-byte-per-character text cannot produce 3 complete characters.

### Issue 2: Incorrect output for `left('Привет', 4)` example
- **What was wrong:** The blog showed `left('Привет', 4)` as broken output (`При?`), but 4 bytes of 2-byte Cyrillic characters is exactly 2 complete characters (Пр) — perfectly valid UTF-8. The column alias `broken_slice` and the narrative about "partial byte sequence" were incorrect.
- **What was changed:** Changed the byte count from 4 to 5, which genuinely breaks (Пр = 4 bytes + leading byte of и = broken). Updated the output to `Пр�`, updated the alias and explanation accordingly.
- **Why:** 4 bytes of 2-byte characters lands exactly on a character boundary and produces valid output. 5 bytes correctly demonstrates the mid-character truncation problem.

### Issue 3: Incorrect `NOT IN` syntax with array literal
- **What was wrong:** `NOT IN (['US', 'EU', 'JP', 'CN'])` wraps an array literal inside parentheses (a tuple), creating a set containing a single array element rather than four string elements. This would not match individual string values as intended.
- **What was changed:** Changed to `NOT IN ('US', 'EU', 'JP', 'CN')` using standard tuple syntax.
- **Why:** The original syntax would evaluate as a comparison against the array itself, not against its individual elements.

## Review Notes
- The core premise of the post (byte-based `left()`/`right()` vs. code-point-based `leftUTF8()`/`rightUTF8()`) is accurate and well-explained.
- The `substringUTF8()` equivalence formulas are correct: `leftUTF8(str, n) = substringUTF8(str, 1, n)` and `rightUTF8(str, n) = substringUTF8(str, lengthUTF8(str) - n + 1, n)`.
- The `substringUTF8('Hello Мир 世界', 3, 5)` example output `llo М` is correct (positions 3-7: l, l, o, space, М).
- The `leftUTF8('Hello Мир 世界', 5)` = `Hello` and `rightUTF8('Hello Мир 世界', 2)` = `世界` outputs are correct.
- The performance comparison section (byte-based functions being marginally faster for ASCII data) is accurate.
- Replacement character rendering (`�`) in the fixed outputs is a simplification — actual display depends on the ClickHouse client and terminal. This is an acceptable convention for a blog post.
