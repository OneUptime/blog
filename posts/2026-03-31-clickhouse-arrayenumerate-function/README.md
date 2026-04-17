# How to Use arrayEnumerate() and arrayEnumerateUniq() in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, Deduplication, arrayEnumerate, arrayEnumerateUniq

Description: Learn how arrayEnumerate() and arrayEnumerateUniq() work in ClickHouse to index arrays and count repeated elements for deduplication in GROUP BY queries.

---

ClickHouse provides powerful array functions that make working with nested data straightforward. Two of the most useful for indexing and deduplication are `arrayEnumerate` and `arrayEnumerateUniq`. Understanding these functions unlocks elegant patterns for counting, deduplicating, and ranking array elements directly in SQL.

## arrayEnumerate - Indexing Array Elements

`arrayEnumerate(arr)` returns a new array of the same length where each element is its 1-based position index. It behaves like a zip with a counter, giving you positional access to array elements without unnesting to rows first.

The signature is straightforward:

```text
arrayEnumerate(arr) -> Array(UInt32)
```

A basic example shows the positional output clearly:

```sql
SELECT arrayEnumerate(['a', 'b', 'c', 'd']) AS positions;
-- Result: [1, 2, 3, 4]
```

You can combine `arrayEnumerate` with `arrayJoin` to produce a row index alongside each unnested element. This is useful when you need to track the original position of each element after flattening:

```sql
SELECT
    val,
    pos
FROM (
    SELECT
        ['apple', 'banana', 'cherry'] AS items,
        arrayEnumerate(items) AS pos
)
ARRAY JOIN items AS val, pos;
```

A cleaner approach uses `ARRAY JOIN` with both the array and its enumeration together:

```sql
SELECT
    tag,
    idx
FROM (
    SELECT
        ['error', 'warning', 'info'] AS tags,
        arrayEnumerate(['error', 'warning', 'info']) AS idxs
)
ARRAY JOIN tags AS tag, idxs AS idx;
-- Result:
-- error   1
-- warning 2
-- info    3
```

## arrayEnumerateUniq - Counting Repeated Elements

`arrayEnumerateUniq(arr)` is different - it returns an array where each element indicates how many times that value has appeared up to and including that position. The first occurrence of any value gets a 1, the second occurrence gets a 2, and so on.

```text
arrayEnumerateUniq(arr) -> Array(UInt32)
```

This is best understood with a concrete example:

```sql
SELECT arrayEnumerateUniq(['a', 'b', 'a', 'c', 'b', 'a']) AS occurrence_counts;
-- Result: [1, 1, 2, 1, 2, 3]
-- 'a' appears for the 1st, 2nd, 3rd time at positions 1, 3, 6
-- 'b' appears for the 1st, 2nd time at positions 2, 5
-- 'c' appears for the 1st time at position 4
```

## Deduplication with arrayEnumerateUniq and arrayJoin

The most powerful use of `arrayEnumerateUniq` is deduplication when using `arrayJoin` in a `GROUP BY` query. When you unnest an array column using `arrayJoin`, duplicate values in the array would be counted multiple times in aggregations. Filtering to only rows where the occurrence count equals 1 keeps only the first occurrence of each value.

Consider a table of user sessions where each session has an array of visited pages. You want to count how many unique users visited each page, but a single user might visit the same page multiple times within one session:

```sql
-- Sample data setup
CREATE TABLE user_sessions
(
    user_id UInt32,
    session_id UInt32,
    pages Array(String)
) ENGINE = Memory;

INSERT INTO user_sessions VALUES
    (1, 1, ['home', 'about', 'home', 'pricing']),
    (1, 2, ['pricing', 'contact']),
    (2, 1, ['home', 'blog', 'blog', 'about']),
    (3, 1, ['home']);
```

Without deduplication, `arrayJoin` would count repeated pages multiple times per session:

```sql
-- This overcounts: 'home' appears twice in user 1's first session
SELECT
    page,
    count() AS raw_count
FROM user_sessions
ARRAY JOIN pages AS page
GROUP BY page
ORDER BY raw_count DESC;
```

With `arrayEnumerateUniq`, keep only the first occurrence of each page per row:

```sql
SELECT
    page,
    count() AS deduplicated_count
FROM (
    SELECT
        pages AS page_arr,
        arrayEnumerateUniq(pages) AS enum_arr
    FROM user_sessions
)
ARRAY JOIN page_arr AS page, enum_arr AS occurrence
WHERE occurrence = 1
GROUP BY page
ORDER BY deduplicated_count DESC;
```

## Multi-Array Deduplication

`arrayEnumerateUniq` also accepts multiple arrays. In this form it treats tuples of corresponding elements as the unit of uniqueness - an element is only considered a repeat if the same combination appeared earlier:

```sql
SELECT arrayEnumerateUniq(
    ['a', 'b', 'a', 'a'],
    [1,   1,   2,   1  ]
) AS combo_counts;
-- Result: [1, 1, 1, 2]
-- ('a',1) first at pos 1, ('b',1) first at pos 2,
-- ('a',2) first at pos 3, ('a',1) second at pos 4
```

This is useful when deduplicating on composite keys within arrays.

## Practical Example - Counting Unique Tags Per Article

Suppose you store article tags in arrays and want to count unique tag occurrences across all articles, where one article may list the same tag twice by mistake:

```sql
CREATE TABLE articles
(
    article_id UInt32,
    tags Array(String)
) ENGINE = Memory;

INSERT INTO articles VALUES
    (1, ['sql', 'database', 'sql', 'clickhouse']),
    (2, ['clickhouse', 'performance', 'database']),
    (3, ['sql', 'analytics']);

-- Count unique tag appearances across articles (deduplicated per article)
SELECT
    tag,
    count() AS article_count
FROM (
    SELECT
        tags AS tag_arr,
        arrayEnumerateUniq(tags) AS enum_arr
    FROM articles
)
ARRAY JOIN tag_arr AS tag, enum_arr AS occurrence
WHERE occurrence = 1
GROUP BY tag
ORDER BY article_count DESC;
-- sql        2  (not 3, because the duplicate in article 1 is excluded)
-- database   2
-- clickhouse 2
-- performance 1
-- analytics  1
```

## Summary

`arrayEnumerate` gives you a 1-based positional index array that pairs naturally with `ARRAY JOIN` when you need to track element positions. `arrayEnumerateUniq` tracks cumulative occurrence counts per value, making it the standard ClickHouse technique for deduplicating array elements during unnesting in GROUP BY queries. Together these functions handle indexing and deduplication patterns that would otherwise require subqueries or window functions in traditional SQL engines.
