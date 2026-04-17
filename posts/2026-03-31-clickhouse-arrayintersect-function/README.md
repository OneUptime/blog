# How to Use arrayIntersect() Function in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Array Function, arrayIntersect, Set Operation

Description: Learn how arrayIntersect() returns common elements across multiple ClickHouse arrays for shared tag detection, cohort overlap analysis, and multi-set intersection queries.

---

Set intersection - finding elements that appear in all of a given collection of arrays - is a common operation in tagging systems, cohort analysis, and recommendation engines. ClickHouse's `arrayIntersect` function takes two or more arrays and returns a new array containing only the elements present in every input array. It removes duplicates in the output and handles any number of input arrays.

## Function Signature

```text
arrayIntersect(arr1, arr2 [, arr3, ...]) -> Array(T)
```

All input arrays must have the same element type. The result contains elements present in all arrays, with no duplicates. The order of elements in the output is not guaranteed.

## Basic Usage

```sql
-- Intersection of two arrays
SELECT arrayIntersect([1, 2, 3, 4, 5], [3, 4, 5, 6, 7]) AS common;
-- Result: [3, 4, 5]

-- Intersection of three arrays
SELECT arrayIntersect([1, 2, 3, 4], [2, 3, 4, 5], [3, 4, 5, 6]) AS three_way;
-- Result: [3, 4]

-- No common elements
SELECT arrayIntersect([1, 2, 3], [4, 5, 6]) AS empty_intersection;
-- Result: []

-- Duplicates in input are handled - output has no duplicates
SELECT arrayIntersect([1, 1, 2, 2, 3], [1, 2, 2, 4]) AS deduped;
-- Result: [1, 2]

-- String intersection
SELECT arrayIntersect(['a', 'b', 'c', 'd'], ['b', 'd', 'e']) AS common_strings;
-- Result: ['b', 'd']
```

## Finding Shared Tags Across Items

A standard tagging system stores tags as arrays. `arrayIntersect` finds tags that two items share:

```sql
CREATE TABLE articles
(
    article_id UInt32,
    title String,
    tags Array(String)
) ENGINE = Memory;

INSERT INTO articles VALUES
    (1, 'ClickHouse Internals',     ['clickhouse', 'database', 'performance', 'sql']),
    (2, 'SQL Window Functions',     ['sql', 'database', 'analytics', 'window']),
    (3, 'Time Series with CH',      ['clickhouse', 'time-series', 'analytics', 'performance']),
    (4, 'Indexing Strategies',      ['database', 'performance', 'indexing', 'sql']);

-- Find tags shared between articles 1 and 2
SELECT arrayIntersect(
    (SELECT tags FROM articles WHERE article_id = 1),
    (SELECT tags FROM articles WHERE article_id = 2)
) AS shared_tags;
-- Result: ['sql', 'database']

-- Find tags common to articles 1 and 3
SELECT arrayIntersect(
    (SELECT tags FROM articles WHERE article_id = 1),
    (SELECT tags FROM articles WHERE article_id = 3)
) AS shared_1_3;
-- Result: ['clickhouse', 'performance']
```

## Computing Tag Similarity (Jaccard-like)

Use `arrayIntersect` alongside `arrayDistinct` and set union to compute a similarity score between two tag arrays:

```sql
-- Jaccard similarity: |intersection| / |union|
SELECT
    a1.article_id AS id1,
    a2.article_id AS id2,
    length(arrayIntersect(a1.tags, a2.tags)) AS intersection_size,
    length(arrayDistinct(arrayFlatten([a1.tags, a2.tags]))) AS union_size,
    round(
        length(arrayIntersect(a1.tags, a2.tags)) /
        length(arrayDistinct(arrayFlatten([a1.tags, a2.tags]))),
        3
    ) AS jaccard_similarity
FROM articles a1
CROSS JOIN articles a2
WHERE a1.article_id < a2.article_id
ORDER BY jaccard_similarity DESC;
```

## Cohort Overlap Analysis

In user analytics, cohorts are often defined by which features or events a user has experienced. `arrayIntersect` identifies users in multiple cohorts simultaneously:

```sql
CREATE TABLE user_cohorts
(
    user_id UInt32,
    cohort_memberships Array(String)
) ENGINE = Memory;

INSERT INTO user_cohorts VALUES
    (1, ['power_user', 'early_adopter', 'paid']),
    (2, ['early_adopter', 'churned']),
    (3, ['power_user', 'paid', 'high_value']),
    (4, ['new_user', 'trial']),
    (5, ['power_user', 'early_adopter', 'paid', 'high_value']);

-- Find users who are both 'power_user' AND 'paid'
SELECT
    user_id,
    cohort_memberships,
    arrayIntersect(cohort_memberships, ['power_user', 'paid']) AS matching_cohorts,
    length(arrayIntersect(cohort_memberships, ['power_user', 'paid'])) AS match_count
FROM user_cohorts
WHERE length(arrayIntersect(cohort_memberships, ['power_user', 'paid'])) = 2;
-- user 1: both power_user and paid
-- user 3: both power_user and paid
-- user 5: both power_user and paid
```

## Checking for Any Common Element (hasAny equivalent)

While `hasAny(arr, target)` is the idiomatic ClickHouse way to check if any element of `target` is in `arr`, `arrayIntersect` can serve the same purpose when you also need the matching elements:

```sql
-- Users who have any of these VIP cohorts
SELECT
    user_id,
    arrayIntersect(cohort_memberships, ['high_value', 'paid']) AS vip_cohorts_matched
FROM user_cohorts
WHERE notEmpty(arrayIntersect(cohort_memberships, ['high_value', 'paid']));
-- user 1: ['paid']
-- user 3: ['paid', 'high_value']
-- user 5: ['paid', 'high_value']
```

## Aggregating Common Elements Across All Rows

To find tags that appear in every article (intersection across all rows), combine `groupArray` and `arrayIntersect` via a reduce-style approach:

```sql
-- Find tags present in ALL articles (intersection across entire table)
-- This requires enumerating each row's tags since arrayIntersect is not an aggregate function
SELECT
    arrayIntersect(
        (SELECT tags FROM articles WHERE article_id = 1),
        (SELECT tags FROM articles WHERE article_id = 2),
        (SELECT tags FROM articles WHERE article_id = 3),
        (SELECT tags FROM articles WHERE article_id = 4)
    ) AS universal_tags;
-- Result: [] (no single tag appears in all four articles in this dataset)
```

## Summary

`arrayIntersect` returns elements common to all provided arrays, automatically deduplicating the output. It is the go-to function for shared tag detection, multi-cohort membership checks, set similarity computation, and any pattern that requires "elements in all of these arrays." Pair it with `length()` to count overlaps, `notEmpty()` to filter for any match, and `arrayFlatten` plus `arrayDistinct` to compute union size for Jaccard similarity.
