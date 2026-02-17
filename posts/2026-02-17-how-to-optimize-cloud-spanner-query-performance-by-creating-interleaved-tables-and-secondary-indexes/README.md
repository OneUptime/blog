# How to Optimize Cloud Spanner Query Performance by Creating Interleaved Tables and Secondary Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Database, Performance, Indexing

Description: A practical guide to using interleaved tables and secondary indexes in Cloud Spanner to optimize query performance and reduce latency for related data access.

---

Cloud Spanner is Google's globally distributed relational database, and it handles scale in ways that traditional databases simply cannot. But Spanner's distributed nature means you need to think differently about data layout. Two of the most powerful tools for query optimization in Spanner are interleaved tables and secondary indexes. Used correctly, they can dramatically reduce latency by ensuring related data lives close together physically, even across a distributed system.

## How Spanner Stores Data

Before diving into optimization techniques, it helps to understand how Spanner organizes data. Spanner stores rows sorted by their primary key. Rows with similar primary keys end up on the same split (Spanner's unit of data distribution). When you query data that spans multiple splits, Spanner needs to coordinate across servers, which adds latency.

This is where interleaved tables come in. They let you co-locate parent and child rows on the same split so that queries joining them are fast.

## What Are Interleaved Tables

Interleaving is a way to physically nest child table rows within their parent rows. Instead of storing all Singer rows in one place and all Album rows in another, interleaving stores each Singer's Albums right next to the Singer row. A query that fetches a Singer and their Albums hits a single split instead of potentially reaching across the network.

Here is a standard (non-interleaved) table structure:

```sql
-- Standard tables - Singers and Albums stored independently
-- Queries joining these tables may need to read from different splits
CREATE TABLE Singers (
  SingerId   INT64 NOT NULL,
  FirstName  STRING(1024),
  LastName   STRING(1024),
  BirthDate  DATE,
) PRIMARY KEY (SingerId);

CREATE TABLE Albums (
  AlbumId    INT64 NOT NULL,
  SingerId   INT64 NOT NULL,
  AlbumTitle STRING(MAX),
  ReleaseDate DATE,
) PRIMARY KEY (AlbumId);
```

And here is the interleaved version:

```sql
-- Parent table
CREATE TABLE Singers (
  SingerId   INT64 NOT NULL,
  FirstName  STRING(1024),
  LastName   STRING(1024),
  BirthDate  DATE,
) PRIMARY KEY (SingerId);

-- Child table interleaved in parent
-- The primary key starts with the parent's key (SingerId)
-- This ensures child rows are stored next to their parent
CREATE TABLE Albums (
  SingerId   INT64 NOT NULL,
  AlbumId    INT64 NOT NULL,
  AlbumTitle STRING(MAX),
  ReleaseDate DATE,
) PRIMARY KEY (SingerId, AlbumId),
  INTERLEAVE IN PARENT Singers ON DELETE CASCADE;
```

The key difference is the `INTERLEAVE IN PARENT` clause and the composite primary key that starts with the parent's key.

## When to Use Interleaving

Interleaving makes sense when you frequently query parent and child data together. Common scenarios include:

- Users and their orders
- Products and their reviews
- Accounts and their transactions
- Documents and their sections

Interleaving does NOT make sense when child rows are frequently queried independently of their parent, when the child table is very large relative to the parent (causing hot splits), or when you need to move child rows between parents.

## Multi-Level Interleaving

You can interleave multiple levels deep. Here is a three-level hierarchy:

```sql
-- Level 1: Singers
CREATE TABLE Singers (
  SingerId INT64 NOT NULL,
  Name     STRING(1024),
) PRIMARY KEY (SingerId);

-- Level 2: Albums interleaved in Singers
CREATE TABLE Albums (
  SingerId   INT64 NOT NULL,
  AlbumId    INT64 NOT NULL,
  AlbumTitle STRING(MAX),
) PRIMARY KEY (SingerId, AlbumId),
  INTERLEAVE IN PARENT Singers ON DELETE CASCADE;

-- Level 3: Songs interleaved in Albums
-- All three levels are co-located on the same split
CREATE TABLE Songs (
  SingerId INT64 NOT NULL,
  AlbumId  INT64 NOT NULL,
  SongId   INT64 NOT NULL,
  SongName STRING(MAX),
  Duration INT64,
) PRIMARY KEY (SingerId, AlbumId, SongId),
  INTERLEAVE IN PARENT Albums ON DELETE CASCADE;
```

A query fetching a Singer with all their Albums and Songs touches a single split - that is the power of interleaving.

## Creating Secondary Indexes

While interleaving optimizes access patterns based on the parent-child relationship, secondary indexes address queries that filter or sort by non-primary-key columns.

```sql
-- Create an index on AlbumTitle for fast lookups by album name
-- Without this, Spanner would do a full table scan
CREATE INDEX AlbumsByTitle ON Albums(AlbumTitle);

-- Create an index on release date for range queries
CREATE INDEX AlbumsByReleaseDate ON Albums(ReleaseDate);
```

## Storing Columns in Indexes

By default, a secondary index only stores the indexed columns and the primary key. If your query needs additional columns, Spanner has to do a back-join to the base table, which adds latency. You can avoid this by storing extra columns directly in the index:

```sql
-- Create a covering index that includes AlbumTitle
-- This means queries filtering by ReleaseDate that also need AlbumTitle
-- can be served entirely from the index without a back-join
CREATE INDEX AlbumsByReleaseDate ON Albums(ReleaseDate)
  STORING (AlbumTitle, SingerId);
```

The `STORING` clause adds columns to the index without making them part of the index key. This is particularly impactful for queries that return a small number of non-key columns.

## Interleaved Indexes

Here is where things get really interesting. You can interleave an index in a table, just like you interleave tables. This keeps the index entries co-located with their parent data.

```sql
-- Create an index on Songs that is interleaved in the Singers table
-- This is useful when you query songs filtered by properties
-- but always scoped to a specific singer
CREATE INDEX SongsBySingerAndDuration ON Songs(SingerId, Duration)
  INTERLEAVE IN Singers;
```

An interleaved index is most useful when your queries always filter by the parent key. If you query songs by duration without filtering by SingerId, a non-interleaved index would be better because it stores all entries together regardless of parent.

## NULL-Filtered Indexes

If your indexed column often contains NULL values and your queries always filter for non-NULL values, a NULL-filtered index saves space and improves performance:

```sql
-- Only index rows where ReleaseDate is not NULL
-- Useful when many albums are unreleased (NULL date) and you only
-- query released albums
CREATE NULL_FILTERED INDEX AlbumsByReleaseDateNonNull
  ON Albums(ReleaseDate);
```

## Analyzing Query Performance

Use Spanner's query execution plans to understand whether your indexes and interleaving are being used:

```sql
-- Use EXPLAIN to see the query execution plan
-- Look for "Index Scan" vs "Table Scan" and check for back-joins
EXPLAIN
SELECT a.AlbumTitle, a.ReleaseDate
FROM Albums a
WHERE a.SingerId = 1
ORDER BY a.ReleaseDate;
```

In the Google Cloud Console, the Query Statistics dashboard shows you the most expensive queries, their execution patterns, and which indexes they use. Check this regularly to identify optimization opportunities.

## Best Practices for Index Design

Here are some practical guidelines based on working with Spanner at scale:

Create indexes that match your query patterns. If you filter by column A and sort by column B, create an index on (A, B). Order the index columns to match your WHERE clause first, then ORDER BY.

Use STORING judiciously. Every stored column increases the index size and write amplification. Only store columns that are frequently read with the indexed query.

Be mindful of write overhead. Every secondary index adds write latency because Spanner must update the index for every insert, update, or delete. If you have a write-heavy workload, each index has a cost.

Monitor index usage. Unused indexes waste storage and slow down writes for no benefit. Periodically review your indexes and drop those that are not serving queries.

Combine interleaving and indexes strategically. Use interleaving for the primary parent-child access pattern and secondary indexes for alternative query paths. Together, they cover most access patterns efficiently.

Spanner's distributed architecture gives you global scale, but it rewards you for thinking carefully about data locality. Interleaved tables and well-designed secondary indexes are your primary tools for keeping queries fast as your data grows.
