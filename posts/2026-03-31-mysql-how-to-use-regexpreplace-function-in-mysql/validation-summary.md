# Validation Summary: How to Use REGEXP_REPLACE() Function in MySQL

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- MySQL 8.0+
- REGEXP_REPLACE() function
- ICU Regular Expressions
- SQL string functions

## Sources Consulted
- MySQL 8.0 Reference Manual — Regular Expression Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/regexp.html#function_regexp-replace
- MySQL 8.0 New Regular Expression Functions blog post: https://dev.mysql.com/blog-archive/new-regular-expression-functions-in-mysql-8-0/
- ICU Regular Expressions documentation: https://unicode-org.github.io/icu/userguide/strings/regexp.html

## Issues Found

### 1. Incorrect regex engine description (line 13)
- **What was wrong:** The post stated MySQL "supports full POSIX regular expressions (ICU regex engine)." This is contradictory — ICU regex and POSIX regex are different standards.
- **What was changed:** Corrected to say MySQL 8.0 "uses the ICU (International Components for Unicode) regular expression library, which provides full Unicode support and is multibyte safe."
- **Why:** MySQL 8.0 switched from the Henry Spencer library to ICU. ICU regex is based on Unicode Technical Standard #18, not POSIX ERE. Calling it POSIX is misleading.

### 2. LOWER() inside REGEXP_REPLACE replacement string does not work (lines 82-84)
- **What was wrong:** `REGEXP_REPLACE(email, '@(.+)$', LOWER('@$1'))` — the LOWER() function evaluates on the literal string `'@$1'` before REGEXP_REPLACE processes the replacement, so the captured domain is never actually lowercased.
- **What was changed:** Replaced with a correct approach using `CONCAT(SUBSTRING_INDEX(...), '@', LOWER(SUBSTRING_INDEX(...)))` to properly lowercase just the domain portion.
- **Why:** SQL functions in the replacement argument are evaluated before REGEXP_REPLACE runs. You cannot nest SQL functions to transform captured groups within the replacement string.

### 3. Incorrect digit extraction result (line 99)
- **What was wrong:** Comment stated the result of extracting digits from `'Order #12345 from Jan 2025'` is `'120252025'`.
- **What was changed:** Corrected to `'123452025'`.
- **Why:** The digits in the string are 1,2,3,4,5 (from `#12345`) and 2,0,2,5 (from `2025`), yielding `'123452025'`.

### 4. Replacement backreference syntax (line 118)
- **What was wrong:** Used `'\\1'` (which becomes `\1`) as the replacement backreference in the consecutive character deduplication example.
- **What was changed:** Changed to `'$1'` which is the documented MySQL 8.0 / ICU syntax for backreferences in replacement strings.
- **Why:** MySQL 8.0 documentation specifies `$N` for backreferences in replacement strings. The `\N` syntax is not documented for MySQL replacement strings (it is used in MariaDB).

## Review Notes
- The "Remove SQL injection-like patterns" example works syntactically but is poor security advice. Regex-based sanitization should never replace parameterized queries for SQL injection prevention. The post does note it as "basic sanitization," but readers could misinterpret it as a sufficient defense.
- The `WHERE email REGEXP '[A-Z]'` pattern in the original email example would match lowercase letters too under the default case-insensitive collation. The fix uses `REGEXP BINARY` for correct case-sensitive matching.
- The double-backslash escaping throughout the post (e.g., `'\\s+'`, `'\\1'`) is correct for MySQL string literal escaping — the SQL parser reduces `\\` to `\` before the regex engine processes the pattern.
