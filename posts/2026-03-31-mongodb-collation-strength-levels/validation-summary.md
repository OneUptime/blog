# Validation Summary: How to Configure Collation Strength Levels in MongoDB

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MongoDB collation
- Unicode Collation Algorithm (UCA)
- MongoDB query and index collation options

## Sources Consulted
- MongoDB official documentation on collation: https://www.mongodb.com/docs/manual/reference/collation/
- Unicode Technical Standard #10 (Unicode Collation Algorithm): https://unicode.org/reports/tr10/
- MongoDB documentation on collation strength levels: https://www.mongodb.com/docs/manual/reference/collation/#collation-document-fields
- ICU Collation Concepts (which MongoDB's collation is based on): https://unicode-org.github.io/icu/userguide/collation/concepts.html

## Issues Found

1. **Strength 2 heading and explanation were incorrect (lines 35-43):** The section was titled "Strength 2 - Base + Case" and stated "Accents are ignored, but case matters." This is backwards — strength 2 considers levels 1 (base) and 2 (accents), so case is ignored and accents matter. Fixed the heading to "Strength 2 - Base + Accents" and corrected the explanation.

2. **Self-correction narrative left in the post (lines 45-53):** The post contained an informal self-correction ("Wait - strength 2 ignores accents but NOT case. Let me clarify...") which itself was also technically wrong (it again said strength 2 ignores accents). This entire passage was removed and replaced with a clean, correct explanation of the UCA levels integrated directly into the Strength 2 section.

3. **First Strength 2 code example was wrong (lines 39-43):** Showed `"café"` as matching and `"Cafe"` as not matching at strength 2. This is backwards — at strength 2, case is ignored (so "Cafe" matches) and accents are considered (so "café" does not match). Removed this incorrect example; the corrected example later in the section was already correct.

4. **Comparison table had wrong value for exact match (line 94):** The table showed `"cafe"` as NO MATCH when searching for `"cafe"` at strength 3. An exact string match should match at any strength level. Changed to MATCH.

## Review Notes
- The `caseLevel` option explanation is correct — with `strength: 1` and `caseLevel: true`, a case-sensitivity check is inserted between level 1 and level 2, making case matter while still ignoring accents.
- The practical examples (product search at strength 1, username uniqueness at strength 2, token matching at strength 3) are all appropriate use cases for their respective strength levels.
- The post could benefit from mentioning that collation behavior can vary by locale (e.g., German, French, and Swedish have different accent-handling rules), but this is not an error — just a potential future enhancement.
