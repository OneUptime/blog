# Validation Summary: How to Use the -> and ->> JSON Operators in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (5.7.9+, 8.0.21+)
- SQL
- MySQL JSON data type
- MySQL JSON path operators (`->`, `->>`)
- MySQL JSON functions (`JSON_EXTRACT`, `JSON_UNQUOTE`, `JSON_TYPE`)

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON Search Functions: https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html
- MySQL 8.0 Release Notes (8.0.21): https://dev.mysql.com/doc/relnotes/mysql/8.0/en/news-8-0-21.html
- MySQL 8.0 Reference Manual — JSON_TYPE() function documentation

## Issues Found

### 1. String literal used as left operand of `->` and `->>`
- **What was wrong:** The first code example used a string literal as the left operand: `SELECT '{"city": "Paris"}'->>'$.city'`. The `->` and `->>` operators require a column identifier or (since MySQL 8.0.21) a user variable on the left side. String literals are not valid left-hand operands.
- **What was changed:** Replaced the string literal with a user variable (`SET @city_doc = ...`) to match the pattern used in the rest of the post.
- **Why:** The original code would produce a syntax error in all MySQL versions. The operators are parsed as column-path or variable-path, not expression-path.

### 2. Incomplete version history
- **What was wrong:** The post stated "These operators were introduced in MySQL 5.7.9 and 5.7.13 respectively" but then used user variables with the operators throughout, which only works in MySQL 8.0.21+. This was misleading about version compatibility.
- **What was changed:** Updated the version note to clarify that 5.7.9/5.7.13 introduced the operators for table columns, and that user variable support was added in MySQL 8.0.21.
- **Why:** Readers using MySQL 5.7 would encounter errors trying the user variable examples.

### 3. Misleading comment about JSON type
- **What was wrong:** The comment `-- Type mismatch: comparing JSON string "95" to integer 95` described the value as a "JSON string" but `$.score` is a JSON integer (95), not a JSON string ("95"). The `->` operator preserves the JSON type, so the result is a JSON integer, not a string.
- **What was changed:** Updated the comment to `-- -> returns a JSON value; MySQL coerces for comparison` with a clearer note about JSON-to-SQL coercion.
- **Why:** The original comment incorrectly described the JSON type of the value, which could confuse readers about how JSON typing works.

## Review Notes
- The post correctly explains the difference between `->` (JSON-typed result) and `->>` (unquoted string result) and provides sound advice about when to use each.
- The `ORDER BY profile->>'$.age' + 0` trick for numeric sorting is correct but readers should be aware that `CAST(... AS UNSIGNED)` (as used elsewhere in the post) is generally more explicit and recommended.
- The wildcard path example (`$.items[*].sku`) correctly shows that `->` returns a JSON array for multi-value results.
- `JSON_TYPE()` correctly returns `INTEGER` for JSON integer values, as stated in the post.
