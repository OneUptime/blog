# Validation Summary: How to Use ngramDistance() and ngramSearch() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse
- SQL (ClickHouse dialect)
- ClickHouse string similarity functions: ngramDistance, ngramSearch, and case-insensitive variants

## Sources Consulted
- ClickHouse official documentation — String Search Functions: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions
- ClickHouse official documentation — ngramDistance: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#ngramdistance
- ClickHouse official documentation — ngramSearch: https://clickhouse.com/docs/en/sql-reference/functions/string-search-functions#ngramsearch

## Issues Found

### 1. ngramSearch() described as accepting an array parameter (Critical)
**What was wrong:** The post claimed `ngramSearch(str, arr)` accepts an array as a second argument and returns the closest matching string from that array. The official ClickHouse documentation shows that `ngramSearch(haystack, needle)` takes two string arguments and performs a non-symmetric n-gram comparison between them. There is no array-accepting overload.

**What was changed:** Updated the intro paragraph, function signature section, and summary to accurately describe `ngramSearch` as a non-symmetric two-string comparison function.

### 2. Typo Correction example used non-existent ngramSearch(str, array) syntax (Critical)
**What was wrong:** The SQL example called `ngramSearch(user_query, ['monitoring', 'alerting', ...])` which would fail because ngramSearch does not accept an array. The accompanying output table was also based on this non-existent behavior.

**What was changed:** Rewrote the example to use `arraySort(x -> ngramDistance(user_query, x), terms)[1]` to correctly find the closest matching term from an array of candidates. Removed the fabricated output table since the query was completely rewritten.

### 3. Canonical Values example used non-existent ngramSearchCaseInsensitive(str, array) syntax (Critical)
**What was wrong:** The "Combining ngramSearch with Array of Canonical Values" section called `ngramSearchCaseInsensitive(raw_category, ['Infrastructure', ...])` which does not work because the function does not accept arrays.

**What was changed:** Rewrote the example to use `arraySort(x -> ngramDistanceCaseInsensitive(raw_category, x), [...])` and renamed the section to "Snapping Free Text to Canonical Values".

### 4. Description metadata referenced incorrect ngramSearch behavior
**What was wrong:** The metadata Description line stated "ngramSearch() finds the closest match in an array."

**What was changed:** Updated to "ngramSearch() performs non-symmetric fuzzy matching."

## Review Notes
- The example output values in the "Understanding the Distance Value" table (e.g., `ngramDistance('clickhouse', 'ClickHouse') = 0.5`, `ngramDistance('clickhouse', 'postgresql') = 0.888`) could not be independently verified without running the actual queries. The directional ordering appears correct (identical = 0, completely different = 1), but the specific numeric values may not be exact.
- The post does not mention UTF-8 variants (`ngramDistanceUTF8`, `ngramSearchUTF8`, etc.) which are available for proper Unicode character handling. This is a potential enhancement, not an error.
- The `ngramSearch` return type may vary by ClickHouse version — some documentation references suggest `UInt8` (boolean threshold check) while others describe `Float32` (similarity score). The post's description is written to be compatible with the Float32 interpretation, which is the more practically useful one.
