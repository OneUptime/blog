# Validation Summary: How to Use SOUNDEX() Function in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL
- SOUNDEX() string function
- SOUNDS LIKE operator
- Phonetic matching / fuzzy search

## Sources Consulted
- MySQL 8.0 Reference Manual — String Functions and Operators, SOUNDEX(): https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_soundex
- MySQL 8.0 Reference Manual — SOUNDS LIKE operator: https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#operator_sounds-like
- SQL Server DIFFERENCE() documentation (to confirm it is not a MySQL function): https://learn.microsoft.com/en-us/sql/t-sql/functions/difference-transact-sql
- Standard Soundex algorithm specification (US Census): https://www.archives.gov/research/census/soundex

## Issues Found

1. **MySQL SOUNDEX returns arbitrarily long strings, not 4 characters**: The post stated "The result is a 4-character code: one letter followed by three digits." MySQL's documentation explicitly says `SOUNDEX()` returns an arbitrarily long string, unlike the standard 4-character Soundex. Fixed the description to clarify this MySQL-specific behavior.

2. **Incorrect Johnson query result**: The comment claimed Jones (SOUNDEX='J520') would be returned by `WHERE SOUNDEX(name) = SOUNDEX('Johnson')` (SOUNDEX='J525'). Since J520 ≠ J525, Jones would not match. Removed Jones from the expected results.

3. **Thompson does not match Thomson in MySQL SOUNDEX**: SOUNDEX('Thompson') = 'T5125' while SOUNDEX('Thomson') = 'T525'. The 'p' in Thompson generates an additional digit (code 1), so they don't share the same SOUNDEX code. Replaced Thompson with Thomsen (which does produce T525) in the patients example data.

4. **Customers table schema mismatch**: The "Combining SOUNDEX" section queried `last_name` and `first_name` columns on the `customers` table, which was defined with only a `name` column. Changed the query to reference the `patients` table, which has those columns.

5. **DIFFERENCE() does not exist in MySQL**: The post used `DIFFERENCE()` as if it were a MySQL function. DIFFERENCE() is a SQL Server function with no MySQL equivalent. Removed those examples and replaced with MySQL-compatible SOUNDEX equality comparisons.

6. **Incorrect SOUNDEX('Washington') value**: The post claimed SOUNDEX('Washington') returns 'W252', but MySQL's extended SOUNDEX returns 'W25235' (6 characters). Fixed the value and used this as an example of MySQL's longer-than-4-character output.

7. **Misleading "All return the same code" comment**: The comment stated two names return the same code, but the examples showed different codes (W252 vs W235). Replaced with accurate examples showing a genuine limitation (Lee and Law both returning 'L000').

## Review Notes
- The Soundex digit mapping table in the "How Soundex Works" section is correct (B,F,P,V=1; C,G,J,K,Q,S,X,Z=2; D,T=3; L=4; M,N=5; R=6).
- The SOUNDS LIKE operator description is accurate — it is syntactic sugar for `SOUNDEX(a) = SOUNDEX(b)` per MySQL documentation.
- All remaining SOUNDEX code values in the post (S530 for Smith/Smyth, J525 for Johnson/Jonson, R163 for Robert/Rupert/Rubert) were verified to be correct.
- The summary's recommendation of Levenshtein distance for higher-precision fuzzy matching is sound advice, though MySQL does not have a built-in Levenshtein function (it would require a UDF or application-level implementation).
