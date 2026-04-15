# Validation Summary: How to Use trimBoth(), trimLeft(), trimRight() in ClickHouse

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- ClickHouse (SQL database)
- ClickHouse string functions: trimBoth(), trimLeft(), trimRight()

## Sources Consulted
- ClickHouse official documentation on string functions: https://clickhouse.com/docs/en/sql-reference/functions/string-functions (trimBoth, trimLeft, trimRight entries)
- ClickHouse documentation on string literal syntax and escape sequences

## Issues Found

### 1. Incorrect output in "Cleaning Up Tags and Labels" example
- **What was wrong:** The output table showed `#  cache  #` trimmed with character set `'# []'` producing `  cache  ` (with surrounding spaces). This is incorrect because the space character is part of the trim set `{#, ' ', [, ]}`, so all leading/trailing `#` signs AND spaces are removed consecutively from each end until a non-set character is hit. The correct result is `cache` with no surrounding spaces.
- **What was changed:** Fixed the output table to show `cache` as the result for that row.
- **Why:** The trim functions remove ALL consecutive characters from each edge that are in the specified set, not just one type of character. The spaces between `#` and `cache` are at the edge (after `#` is consumed) and are in the character set, so they are removed too.

### 2. Incorrect explanatory note
- **What was wrong:** The note stated "spaces inside `"  cache  "` remain after the `#` and outer spaces are stripped," implying the spaces between `#` and `cache` are interior characters. They are not — they are edge characters (adjacent to the `#` which is also at the edge) and are in the trim set, so they are removed.
- **What was changed:** Rewrote the note to accurately explain that all characters in the set are stripped consecutively from each end, which is why `#  cache  #` becomes `cache`.

## Review Notes
- The function signatures are shown as `trimBoth(input, characters)` with a required second argument. The official ClickHouse docs show the second parameter as optional: `trimBoth(s[, trim_characters])`. When omitted, these functions default to removing whitespace. Since the blog specifically focuses on the custom character-set feature, this omission is acceptable but worth noting.
- The blog does not mention the aliases `trim`/`ltrim`/`rtrim` or the SQL-standard `TRIM(BOTH chars FROM s)` syntax, which are covered in a companion blog post.
- The `'\n\r '` escape sequences in the log-lines example are valid — ClickHouse string literals support standard escape sequences (`\n`, `\r`, etc.) by default.
