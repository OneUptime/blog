# How to Use trimBoth(), trimLeft(), trimRight() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, String Function, Data Cleaning, SQL

Description: Learn how trimBoth(), trimLeft(), and trimRight() remove specific characters from string edges in ClickHouse, beyond simple whitespace stripping.

---

ClickHouse's trim family of functions removes a set of characters from the beginning, end, or both ends of a string. Unlike many languages where "trim" only removes whitespace, ClickHouse's versions accept an explicit character set, giving you precise control over which characters to strip. This makes them invaluable for cleaning imported CSV data, removing custom delimiters, and stripping punctuation from tokenized fields.

## Function Signatures

```text
trimBoth(input, characters)   -- removes characters from both ends
trimLeft(input, characters)   -- removes characters from the left (start)
trimRight(input, characters)  -- removes characters from the right (end)
```

- `input` - the string to trim
- `characters` - a string whose individual characters form the set to remove

Characters are removed one at a time from each end until a character not in the set is encountered. The order of characters in the `characters` argument does not matter.

## Removing Whitespace (the Basic Case)

To strip standard whitespace, pass a space character or a combination of whitespace characters.

```sql
SELECT
    trimBoth('   hello world   ', ' ')  AS trimmed,
    trimLeft('   hello world   ', ' ')  AS left_trimmed,
    trimRight('   hello world   ', ' ') AS right_trimmed
```

```text
trimmed       | left_trimmed         | right_trimmed
--------------+----------------------+------------------
hello world   | hello world          |    hello world
```

## Stripping Custom Delimiters from Imported Data

Raw data imported from CSV or TSV files sometimes arrives with extra delimiter characters or quote marks around values. `trimBoth` removes them cleanly.

```sql
SELECT
    raw_value,
    trimBoth(raw_value, '"') AS clean_value
FROM (
    SELECT arrayJoin(['"hello"', '"world"', '"42"', 'no quotes']) AS raw_value
)
```

```text
raw_value    | clean_value
-------------+-------------
"hello"      | hello
"world"      | world
"42"         | 42
no quotes    | no quotes
```

## Removing Punctuation from the Edges of Tokens

When tokenizing free-text for search or analysis, words often carry trailing or leading punctuation. You can strip a broad set of punctuation characters in one call.

```sql
SELECT
    token,
    trimBoth(token, '.,!?;:\'"()[]{}') AS clean_token
FROM (
    SELECT arrayJoin(['(hello)', 'world!', '"quoted"', 'normal', '...end...']) AS token
)
```

```text
token      | clean_token
-----------+-------------
(hello)    | hello
world!     | world
"quoted"   | quoted
normal     | normal
...end...  | end
```

## Removing Path Separators

`trimLeft` is useful when you want to normalize file paths that may or may not begin with a leading slash.

```sql
SELECT
    path,
    trimLeft(path, '/') AS relative_path
FROM (
    SELECT arrayJoin(['/var/log/app.log', 'var/log/app.log', '//double/slash']) AS path
)
```

```text
path               | relative_path
-------------------+------------------
/var/log/app.log   | var/log/app.log
var/log/app.log    | var/log/app.log
//double/slash     | double/slash
```

## Stripping Trailing Newlines and Carriage Returns

Log lines pulled from files often carry `\n` or `\r\n` at the end. `trimRight` removes all combinations of these characters.

```sql
SELECT
    length(raw_line)                        AS raw_len,
    length(trimRight(raw_line, '\n\r '))    AS clean_len,
    trimRight(raw_line, '\n\r ')            AS clean_line
FROM raw_log_lines
LIMIT 10
```

## Cleaning Up Tags and Labels

Tags stored as free text may accumulate hash symbols, spaces, or brackets around the actual value. Strip them all at once.

```sql
SELECT
    raw_tag,
    trimBoth(raw_tag, '# []') AS normalized_tag
FROM (
    SELECT arrayJoin(['#performance', ' [database] ', '#  cache  #', 'api']) AS raw_tag
)
```

```text
raw_tag          | normalized_tag
-----------------+---------------
#performance     | performance
 [database]      | database
#  cache  #      | cache
api              | api
```

Note that only characters at the edges are removed, but all characters in the specified set are stripped consecutively from each end until a character not in the set is encountered. This is why `#  cache  #` becomes `cache` — the `#` signs and spaces are all in the character set and are all removed from both ends.

## Practical Example - Cleaning User-Submitted Form Fields

User input often arrives with extra whitespace or stray punctuation. A cleaning pipeline can use `trimBoth` as part of a transformation.

```sql
SELECT
    user_id,
    trimBoth(lower(email), ' ') AS clean_email,
    trimBoth(username, ' _-')   AS clean_username
FROM user_submissions
WHERE event_date = today()
```

## Summary

`trimBoth()`, `trimLeft()`, and `trimRight()` each accept an explicit set of characters to remove from string edges, making them far more flexible than simple whitespace-only trim functions. They are especially useful during data ingestion pipelines for stripping quotes, delimiters, path separators, punctuation, and line endings. When combined with functions like `lower()` or `replaceAll()`, they form the backbone of text normalization workflows in ClickHouse.
