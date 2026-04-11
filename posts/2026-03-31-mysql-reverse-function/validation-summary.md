# Validation Summary: How to Use REVERSE() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL REVERSE() string function
- MySQL functional indexes (MySQL 8.0.13+)
- MySQL LIKE pattern matching
- MySQL CAST function
- Multibyte/Unicode character handling in MySQL

## Sources Consulted
- MySQL 8.0 Reference Manual: String Functions — REVERSE() (https://dev.mysql.com/doc/refman/8.0/en/string-functions.html#function_reverse)
- MySQL 8.0 Reference Manual: CREATE INDEX — Functional Key Parts (https://dev.mysql.com/doc/refman/8.0/en/create-index.html#create-index-functional-key-parts)
- MySQL 8.0 Reference Manual: CAST function (https://dev.mysql.com/doc/refman/8.0/en/cast-functions.html)
- MySQL 8.0 Reference Manual: Pattern Matching with LIKE (https://dev.mysql.com/doc/refman/8.0/en/pattern-matching.html)

## Issues Found

1. **Incorrect CONCAT example output (Generating test data section):** The comment showed `'Widget' -> 'WidgetteGdiW'` with an uppercase 'G'. Since `REVERSE('Widget')` produces `'tegdiW'` (lowercase 'g'), the correct output of `CONCAT('Widget', REVERSE('Widget'))` is `'WidgettegdiW'`. Fixed the comment to use lowercase 'g'.

2. **Misleading domain sorting comment (Reversing domain names section):** The comment listed results in reversed-segment notation (`com.example.api, com.example.www, com.google.www, io.github.user`) which suggests REVERSE() reverses domain segments. In reality, REVERSE() reverses all characters (`api.example.com` becomes `moc.elpmaxe.ipa`), and the sort order differs from segment-level reversal (e.g., `google.com` sorts before `example.com` because `'elgoog' < 'elpmaxe'`). Updated the description and comment to accurately describe that REVERSE groups domains by TLD without implying a perfect hierarchical segment-level sort.

## Review Notes
- The functional index syntax `((REVERSE(domain)))` requires MySQL 8.0.13 or later. The post does not mention this version requirement. Earlier MySQL versions would need a generated/virtual column with a regular index instead.
- The palindrome comparison `word = REVERSE(word)` uses the default collation, so it is case-insensitive with common collations like `utf8mb4_0900_ai_ci`. The post doesn't mention this, meaning `'Racecar'` would also match as a palindrome in a case-insensitive collation. This is not incorrect but could be noted for completeness.
- All SQL syntax is correct and follows current MySQL 8.0+ conventions.
