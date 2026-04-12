# Validation Summary: How to Use REGEXP_REPLACE() and REGEXP_SUBSTR() in MySQL 8

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL 8.0 / 8.4
- Regular Expressions (ICU library)
- REGEXP_REPLACE() function
- REGEXP_SUBSTR() function
- REGEXP_LIKE() function (mentioned)
- REGEXP_INSTR() function (mentioned)

## Sources Consulted
- MySQL 8.0 Reference Manual — Regular Expression Function Descriptions: https://dev.mysql.com/doc/refman/8.0/en/regexp.html
- MySQL 8.4 Reference Manual — Regular Expression Function Descriptions: https://dev.mysql.com/doc/refman/8.4/en/regexp.html

## Issues Found

### 1. Non-existent `group_num` parameter on REGEXP_SUBSTR()
**What was wrong:** The post documented `REGEXP_SUBSTR()` as having a 6th `group_num` parameter for capture group extraction. The full signature was listed as `REGEXP_SUBSTR(str, pattern [, pos [, occurrence [, match_type [, group_num]]]])`. This parameter does not exist in any version of MySQL 8 (verified against both 8.0 and 8.4 official docs). The actual signature is `REGEXP_SUBSTR(str, pattern [, pos [, occurrence [, match_type]]])`.

**What was changed:** Removed `group_num` from the signature, replaced the `group_num` parameter description with the `match_type` description (which was missing from that section), and updated the Summary paragraph to reference `pos`, `occurrence`, and `match_type` instead of `group_num`.

### 2. Broken "Extract Capture Groups" example
**What was wrong:** The example `SELECT REGEXP_SUBSTR('2026-03-31', '([0-9]{4})-([0-9]{2})-([0-9]{2})', 1, 1, '', 2) AS month;` passed 6 arguments to `REGEXP_SUBSTR()`, which only accepts 5. This would produce an error in MySQL.

**What was changed:** Replaced with a working equivalent that uses the `occurrence` parameter: `SELECT REGEXP_SUBSTR('2026-03-31', '[0-9]+', 1, 2) AS month;` — this extracts the second numeric match (the month `03`) without relying on capture groups.

### 3. Broken "Extracting Domain Names" example
**What was wrong:** `REGEXP_SUBSTR(email, '@(.+)', 1, 1, '', 1)` also passed 6 arguments, using the non-existent `group_num` parameter.

**What was changed:** Replaced with `REGEXP_SUBSTR(email, '[^@]+$')` which matches one or more non-`@` characters at the end of the string, correctly extracting the domain without capture groups.

## Review Notes
- MySQL's `REGEXP_SUBSTR()` does not support capture group extraction in any 8.x release. This is a notable limitation compared to regex functions in PostgreSQL or Oracle. If capture group extraction is needed, `REGEXP_REPLACE()` can sometimes be used as a workaround (e.g., `REGEXP_REPLACE(str, '^.*pattern(.*)$', '$1')`).
- All other code examples (REGEXP_REPLACE usage, pattern syntax, parameter usage) were verified as correct.
- The `match_type` parameter description omits `'n'` (dot matches newline) and `'u'` (Unix-only line endings), but listing only the three most common modifiers is reasonable for a tutorial.
