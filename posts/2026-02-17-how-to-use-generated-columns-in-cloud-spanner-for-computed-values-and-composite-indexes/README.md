# How to Use Generated Columns in Cloud Spanner for Computed Values and Composite Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Database, SQL, Indexing

Description: Learn how to use generated columns in Cloud Spanner to store computed values, create composite indexes, and simplify your application logic with server-side calculations.

---

Generated columns in Cloud Spanner let you define columns whose values are automatically computed from other columns in the same row. If you have ever found yourself computing the same derived value in every INSERT and UPDATE statement across multiple services, generated columns are the answer.

They come in two flavors: stored and non-stored. Stored generated columns persist the computed value to disk, so they can be indexed. Non-stored ones are computed at read time. Both have their uses, and choosing the right one depends on your access patterns.

## When Generated Columns Make Sense

Here are some common scenarios where generated columns really shine:

- **Normalizing data for search.** Storing a lowercased version of an email or name for case-insensitive lookups.
- **Extracting parts of a value.** Pulling the year from a timestamp or the domain from an email address.
- **Combining columns.** Creating a composite key or a display name from first and last name fields.
- **Computing derived metrics.** Calculating a total price from quantity and unit price.
- **Simplifying index creation.** You can index a generated column, which means you can effectively create expression-based indexes.

## Creating a Stored Generated Column

Let's start with a practical example. Suppose you have a Products table and you want to automatically compute the total price from quantity and unit price.

```sql
-- Products table with a stored generated column for total price
CREATE TABLE Products (
  ProductId INT64 NOT NULL,
  Name STRING(256) NOT NULL,
  UnitPrice FLOAT64 NOT NULL,
  Quantity INT64 NOT NULL,
  -- This column is automatically computed and stored on disk
  TotalPrice FLOAT64 NOT NULL AS (UnitPrice * Quantity) STORED,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (ProductId);
```

The `STORED` keyword means Spanner computes `TotalPrice` whenever a row is inserted or updated, and writes it to disk. You never set this column directly - Spanner handles it.

Now you can query it like any other column:

```sql
-- Query products by their computed total price
SELECT ProductId, Name, UnitPrice, Quantity, TotalPrice
FROM Products
WHERE TotalPrice > 500.0
ORDER BY TotalPrice DESC;
```

## Creating Indexes on Generated Columns

One of the biggest advantages of stored generated columns is that you can index them. This lets you build expression-based indexes that would otherwise be impossible in Spanner.

For example, imagine you want case-insensitive email lookups:

```sql
-- Users table with a generated column for normalized email
CREATE TABLE Users (
  UserId INT64 NOT NULL,
  Email STRING(256) NOT NULL,
  DisplayName STRING(256),
  -- Store a lowercase version of the email for searching
  EmailNormalized STRING(256) AS (LOWER(Email)) STORED,
  CreatedAt TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (UserId);

-- Index on the normalized email for fast case-insensitive lookups
CREATE UNIQUE INDEX UsersByNormalizedEmail
ON Users(EmailNormalized);
```

Now you can do case-insensitive email lookups that hit an index:

```sql
-- This query uses the index on the normalized email column
SELECT UserId, Email, DisplayName
FROM Users
WHERE EmailNormalized = LOWER('User@Example.COM');
```

Without generated columns, you would need to either normalize the email in your application code before every insert and query, or scan the entire table for case-insensitive matches.

## Composite Key Patterns

Generated columns work great for creating composite keys that combine multiple columns. This is useful when you need to partition or shard data based on a combination of fields.

```sql
-- Events table with a composite partition key generated from region and date
CREATE TABLE Events (
  EventId INT64 NOT NULL,
  Region STRING(32) NOT NULL,
  EventDate DATE NOT NULL,
  EventType STRING(64) NOT NULL,
  Payload JSON,
  -- Composite key for partitioning queries by region and month
  RegionMonth STRING(64) AS (
    CONCAT(Region, '-', FORMAT_DATE('%Y-%m', EventDate))
  ) STORED,
) PRIMARY KEY (EventId);

-- Index for efficiently querying events by region and month
CREATE INDEX EventsByRegionMonth
ON Events(RegionMonth, EventType);
```

This lets you query events by region and month combination efficiently:

```sql
-- Find all error events in us-east1 for January 2026
SELECT EventId, EventType, EventDate
FROM Events@{FORCE_INDEX=EventsByRegionMonth}
WHERE RegionMonth = 'us-east1-2026-01'
  AND EventType = 'ERROR';
```

## Non-Stored Generated Columns

Non-stored generated columns are computed at read time rather than being persisted to disk. They save storage space but cannot be indexed.

```sql
-- Table with a non-stored generated column (computed at read time)
CREATE TABLE Invoices (
  InvoiceId INT64 NOT NULL,
  Subtotal FLOAT64 NOT NULL,
  TaxRate FLOAT64 NOT NULL,
  -- Computed at query time, not stored on disk
  TaxAmount FLOAT64 AS (Subtotal * TaxRate),
  TotalAmount FLOAT64 AS (Subtotal + Subtotal * TaxRate),
) PRIMARY KEY (InvoiceId);
```

Notice the absence of the `STORED` keyword. These columns exist only in query results - Spanner calculates them on the fly.

Use non-stored generated columns when:
- You do not need to filter or sort by the computed value
- Storage cost is a concern
- The computation is simple and fast

Use stored generated columns when:
- You need to create an index on the computed value
- The computation is referenced frequently in WHERE clauses
- You want to avoid recomputing on every read

## Adding Generated Columns to Existing Tables

You can add generated columns to tables that already have data. Spanner will backfill the values for existing rows.

```sql
-- Add a generated column to an existing table
ALTER TABLE Users
ADD COLUMN NameLower STRING(256) AS (LOWER(DisplayName)) STORED;
```

Be aware that the backfill operation can take time on large tables. Spanner handles this in the background, and the column will show NULL values until the backfill completes for each row.

After the backfill is done, you can create an index on the new column:

```sql
-- Create an index after the backfill completes
CREATE INDEX UsersByNameLower
ON Users(NameLower);
```

## Expressions You Can Use

Generated columns support a wide range of SQL expressions. Here are some patterns that come up often:

```sql
-- Extract year from a timestamp
YearCreated INT64 AS (EXTRACT(YEAR FROM CreatedAt)) STORED

-- Concatenate first and last name
FullName STRING(512) AS (CONCAT(FirstName, ' ', LastName)) STORED

-- Hash-based sharding column
ShardId INT64 AS (MOD(FARM_FINGERPRINT(CAST(UserId AS STRING)), 10)) STORED

-- Boolean flag based on a condition
IsHighValue BOOL AS (TotalAmount > 10000.0) STORED

-- Substring extraction
DomainName STRING(256) AS (
  REGEXP_EXTRACT(Email, r'@(.+)$')
) STORED
```

## Restrictions to Keep in Mind

Generated columns have a few constraints:

- The expression can only reference columns from the same table and row.
- You cannot reference other generated columns in a generated column expression.
- You cannot directly INSERT or UPDATE a generated column. Spanner computes it automatically.
- Some functions are not allowed in generated column expressions (like CURRENT_TIMESTAMP or PENDING_COMMIT_TIMESTAMP).
- Stored generated columns consume storage space just like regular columns.

## Practical Example: Application Code

Here is how you work with generated columns from application code. You simply ignore them during writes and use them during reads:

```python
# Python example: inserting data into a table with generated columns
from google.cloud import spanner

client = spanner.Client(project='my-project')
instance = client.instance('my-instance')
database = instance.database('my-database')

def insert_product(product_id, name, unit_price, quantity):
    # Notice we do NOT include TotalPrice - Spanner computes it
    with database.batch() as batch:
        batch.insert(
            table='Products',
            columns=['ProductId', 'Name', 'UnitPrice', 'Quantity', 'CreatedAt'],
            values=[
                [product_id, name, unit_price, quantity, spanner.COMMIT_TIMESTAMP],
            ],
        )

def get_expensive_products(min_total):
    # We CAN read the generated column in queries
    with database.snapshot() as snapshot:
        results = snapshot.execute_sql(
            "SELECT ProductId, Name, TotalPrice "
            "FROM Products "
            "WHERE TotalPrice > @min_total "
            "ORDER BY TotalPrice DESC",
            params={'min_total': min_total},
            param_types={'min_total': spanner.param_types.FLOAT64},
        )
        for row in results:
            print(f"Product {row[0]}: {row[1]} - ${row[2]}")
```

## Wrapping Up

Generated columns are one of those features that seem small but end up saving a lot of headaches. They move computed logic from your application into the database, which means every service that touches the data gets consistent results without duplicating the computation. Combined with Spanner's indexing capabilities, stored generated columns give you expression-based indexes that can dramatically speed up queries on derived values.

Start with the patterns you see repeated most in your application layer - case normalization, composite keys, derived calculations - and move them into generated columns. Your codebase will be cleaner, and your queries will be faster.
