# Validation Summary: How to Use JSON_SEARCH() in MySQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MySQL (JSON functions, specifically JSON_SEARCH())
- SQL
- JSON document storage in relational databases

## Sources Consulted
- MySQL 8.0 Reference Manual — JSON_SEARCH(): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-search
- MySQL 8.0 Reference Manual — JSON Path Syntax: https://dev.mysql.com/doc/refman/8.0/en/json.html#json-path-syntax
- MySQL 8.0 Reference Manual — JSON_EXTRACT(): https://dev.mysql.com/doc/refman/8.0/en/json-search-functions.html#function_json-extract

## Issues Found

1. **Incorrect claim about 'one' mode match ordering (line 85)**: The post stated "the array search comes before the object path in internal ordering." This is wrong — MySQL documentation explicitly states "It is not defined which match is considered first" for 'one' mode. Fixed the explanation to note that match order is undefined and may vary between MySQL versions.

2. **Incomplete output table for "Restricting Search to a Specific Path" section (lines 169-175)**: The SQL query had no WHERE clause and would return all 4 rows, but the output table only showed Items A and D. Added the missing Items B and C rows with NULL values for both columns.

3. **Incorrect claim about 'all' mode return type with single match (line 203)**: The post claimed "'all' returns a JSON array of strings (even if only one match)." Per MySQL docs, when there are multiple matches they are "autowrapped as an array," implying a single match returns a scalar path string, not an array. Fixed the description to accurately reflect this behavior.

4. **Missing output for second wildcard query (lines 149-153)**: The `electr%` wildcard search restricted to `$.tags` had no example output shown. Added the expected output table showing Items A and C matching with `"$.tags[0]"` and Items B and D returning NULL.

## Review Notes
- The 'one' mode example outputs (e.g., Item A returning `"$.tags[1]"`) may not match what every MySQL version returns, since the documentation says match order is undefined. The outputs shown could be valid for the author's MySQL instance but are not guaranteed to be reproducible. This is now noted in the text.
- MySQL's internal binary JSON format sorts object keys by key length first, then lexicographically. This means `"meta"` (4 chars) would typically be stored/traversed before `"tags"` (4 chars), which actually contradicts the original claim that arrays are searched first. The undefined-order caveat is the correct way to handle this.
- All SQL syntax, function signatures, wildcard behavior, NULL handling, and the JSON_EXTRACT integration pattern are correct and well-documented.
