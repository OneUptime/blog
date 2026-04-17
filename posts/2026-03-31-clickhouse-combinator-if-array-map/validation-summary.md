# Validation Summary: How to Use -If, -Array, -Map Aggregate Combinators in ClickHouse

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse
- ClickHouse SQL aggregate functions
- ClickHouse combinators: `-If`, `-Array`, `-Map`, `-ArrayIf`
- ClickHouse data types: `Array(T)`, `Map(K, V)`, `MergeTree` engine

## Sources Consulted
- ClickHouse docs — Aggregate Function Combinators: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators
- ClickHouse docs — `-Map` combinator: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/combinators#-map
- ClickHouse docs — `sumMap` reference: https://clickhouse.com/docs/en/sql-reference/aggregate-functions/reference/summap

## Issues Found
No technical issues found.

Verification notes:
- `-If`, `-Array`, `-Map` are all documented combinators in ClickHouse.
- Combinator stacking rule ("`-Array` must come before `-If`", so `sumArrayIf` is valid) matches the blog's `-ArrayIf` example. The docs explicitly note that the condition argument "remains non-array" (scalar), so `sumArrayIf(durations, page = '/home')` with a per-row scalar condition is correct.
- `sumMap`/`minMap`/`maxMap` applied to a `Map(K, V)` column return `Map(K, V)` via the `-Map` combinator, matching the blog's output format.
- `countArray(arr)` counts individual elements across all arrays in a group, consistent with the blog's claim and example outputs (4 for `/about`, 5 for `/home`).
- Arithmetic in all sample outputs is correct:
  - `sumIf/countIf/avgIf` by region for the `orders` table (eu-west: 300/1/300, us-east: 320/1/160).
  - `sumArray`/`avgArray`/`countArray` for `page_views` (/about: 1550/387.5/4, /home: 6450/1290/5).
  - `sumArrayIf(durations, page = '/home')` = 6450.
  - `sumMap` per user (user 1: export=2, import=1, search=8; user 2: export=4, import=2, search=8) and global (export=6, import=3, search=16).
  - `minMap`/`maxMap` global values (min: export=2, import=1, search=1; max: export=4, import=2, search=7).
- ClickHouse's Map output ordering is keys in sorted order, matching the alphabetical key order shown in the blog's results.
- `CREATE TABLE` statements (MergeTree engine, ORDER BY clauses, column types) are syntactically valid.

## Review Notes
- The blog notes that `-If` is "often faster" than `CASE WHEN` because the filter is pushed into the aggregation kernel — this is an accurate performance characterization of ClickHouse's implementation.
- The comment in the `page_views` table says "time spent on each element of the page in ms" — the word "element" is slightly ambiguous but is a narrative choice, not a technical error, so left as-is.
- The summary mentions composing with `-State` and `-Distinct`, which is accurate; ordering rules between combinators do apply but are not detailed in the post (out of scope for an introductory tutorial).
