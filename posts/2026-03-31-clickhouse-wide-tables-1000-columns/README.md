# How to Handle Wide Tables (1000+ Columns) in ClickHouse

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Wide Table, Schema Design, Performance, Column Store

Description: Strategies for working with wide tables of 1000+ columns in ClickHouse, including projection tricks, sparse columns, and schema normalization.

---

## The Wide Table Problem

ClickHouse is a column store, so it reads only the columns you query. This means wide tables are more manageable than in row-oriented databases - but there are still limits. ClickHouse officially recommends a maximum of ~1,000 columns per table, and performance degrades with very wide schemas due to metadata overhead and merge costs.

## When You Need Wide Tables

Typical scenarios include:
- Feature stores for machine learning (one row per user, hundreds of features)
- EAV (Entity-Attribute-Value) denormalized into columns
- Schema-per-tenant flattened into a single wide table

## Approach 1 - Use Sparse/Nullable Columns Carefully

Wide tables often have many NULL values. Avoid `Nullable(T)` for columns that are almost always populated - the extra null bitmap adds overhead.

```sql
CREATE TABLE user_features (
    user_id     UInt64,
    feature_001 Float32,
    feature_002 Float32,
    -- ... up to 1000+
    feature_999 Float32
) ENGINE = MergeTree()
ORDER BY user_id;
```

Use `DEFAULT 0` instead of `Nullable` for numeric features:

```sql
feature_500 Float32 DEFAULT 0
```

## Approach 2 - Vertical Partitioning

Split the wide table into groups of related columns, joined on a key:

```sql
CREATE TABLE user_features_behavioral (
    user_id UInt64,
    clicks_7d  UInt32,
    sessions_7d UInt32,
    pages_7d   UInt32
) ENGINE = MergeTree() ORDER BY user_id;

CREATE TABLE user_features_transactional (
    user_id    UInt64,
    orders_7d  UInt32,
    spend_7d   Float64
) ENGINE = MergeTree() ORDER BY user_id;
```

Join at query time using ClickHouse's efficient JOIN on sorted keys.

## Approach 3 - Map/Array Columns for Sparse Features

For truly sparse feature sets, store as a map:

```sql
CREATE TABLE user_features_sparse (
    user_id  UInt64,
    features Map(String, Float32)
) ENGINE = MergeTree()
ORDER BY user_id;
```

Query specific features:

```sql
SELECT user_id, features['click_rate'] AS click_rate
FROM user_features_sparse
WHERE features['click_rate'] > 0.5;
```

## Limiting Column Reads

When querying wide tables, always be explicit about columns:

```sql
-- Bad: reads all 1000+ columns
SELECT * FROM user_features WHERE user_id = 42;

-- Good: reads only needed columns
SELECT user_id, feature_001, feature_050
FROM user_features
WHERE user_id = 42;
```

## Merge Performance with Wide Tables

Wide tables slow down merges because each column is a separate file on disk (in Wide part format). Tune merge settings to reduce memory pressure during merges:

```sql
ALTER TABLE user_features MODIFY SETTING
    merge_max_block_size = 4096,
    max_bytes_to_merge_at_max_space_in_pool = 53687091200;
```

This reduces `merge_max_block_size` from the default of 8192 to 4096 to lower per-merge memory usage (each block spans all columns), and reduces `max_bytes_to_merge_at_max_space_in_pool` from the default of ~150 GiB to 50 GiB to limit the size of individual merge operations.

## Summary

Wide tables in ClickHouse work best when you query a small subset of columns, use vertical partitioning for large schemas, and prefer default values over Nullable for numeric columns. For very sparse data, Map columns offer a practical alternative to hundreds of mostly-empty columns.
