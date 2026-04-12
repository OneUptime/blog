# How to Use BOOLEAN (BOOL) Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Type, Boolean, Integer, Constraint

Description: Learn how MySQL handles BOOLEAN and BOOL types, how they map to TINYINT(1), and best practices for storing true/false values in your schema.

---

MySQL does not have a native boolean type. When you declare a column as `BOOLEAN` or `BOOL`, MySQL silently maps it to `TINYINT(1)`. Understanding this underlying representation helps you avoid surprising behavior when querying or inserting boolean values.

## How BOOLEAN Maps to TINYINT(1)

```sql
CREATE TABLE feature_flags (
    flag_id    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    flag_name  VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    is_public  BOOL NOT NULL DEFAULT TRUE
);

-- Verify the actual column type
DESCRIBE feature_flags;
-- is_enabled: tinyint(1)
-- is_public:  tinyint(1)
```

The column stores any integer value from -128 to 127. Only 0 is considered false; any non-zero value is considered true by MySQL boolean functions.

## Inserting TRUE and FALSE

MySQL accepts the literals `TRUE` and `FALSE` (case-insensitive) as aliases for 1 and 0.

```sql
INSERT INTO feature_flags (flag_name, is_enabled, is_public)
VALUES ('dark_mode', TRUE, FALSE);

INSERT INTO feature_flags (flag_name, is_enabled, is_public)
VALUES ('beta_ui', 1, 0);

-- Both forms store the same underlying integer
SELECT flag_name, is_enabled, is_public FROM feature_flags;
```

## Querying Boolean Columns

Use `IS TRUE`, `IS FALSE`, or direct comparison. Avoid relying on implicit truthy comparisons across different SQL clients.

```sql
-- Explicit boolean test (preferred)
SELECT flag_name FROM feature_flags WHERE is_enabled IS TRUE;

-- Equivalent integer comparison
SELECT flag_name FROM feature_flags WHERE is_enabled = 1;

-- Find disabled flags
SELECT flag_name FROM feature_flags WHERE is_enabled IS FALSE;
SELECT flag_name FROM feature_flags WHERE is_enabled = 0;

-- NOT operator works on TINYINT(1) as expected
SELECT flag_name FROM feature_flags WHERE NOT is_enabled;
```

## Adding a CHECK Constraint to Enforce 0/1

Because the underlying type accepts any `TINYINT` value, you can enforce strict boolean semantics using a `CHECK` constraint.

```sql
CREATE TABLE user_settings (
    user_id          INT UNSIGNED NOT NULL PRIMARY KEY,
    email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
    two_fa_enabled   BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT chk_email_verified CHECK (email_verified IN (0, 1)),
    CONSTRAINT chk_two_fa         CHECK (two_fa_enabled IN (0, 1))
);
```

## Updating Boolean Columns

```sql
-- Enable a flag
UPDATE feature_flags SET is_enabled = TRUE WHERE flag_name = 'dark_mode';

-- Toggle a flag
UPDATE feature_flags SET is_enabled = NOT is_enabled WHERE flag_id = 1;

-- Bulk enable
UPDATE feature_flags SET is_enabled = 1 WHERE is_public = 1;
```

## Indexing Boolean Columns

A plain B-tree index on a boolean column is usually not helpful because it has very low cardinality (only two distinct values). Composite indexes that include the boolean column as the last key part can help for selective queries.

```sql
-- Low-selectivity index - rarely useful
CREATE INDEX idx_is_enabled ON feature_flags (is_enabled);

-- Composite index - more useful for selective filtering
CREATE INDEX idx_public_enabled ON feature_flags (is_public, is_enabled);

-- Use the composite index to filter efficiently
SELECT flag_name FROM feature_flags
USE INDEX (idx_public_enabled)
WHERE is_public = 1 AND is_enabled = 1;
```

## Aggregate Patterns on Boolean Columns

Because `TINYINT(1)` stores 1 for true, you can use `SUM()` and `AVG()` to compute counts and ratios directly.

```sql
SELECT
    COUNT(*)                          AS total_flags,
    SUM(is_enabled)                   AS enabled_count,
    SUM(is_enabled) / COUNT(*) * 100  AS enabled_pct
FROM feature_flags;
```

## ORM and Driver Considerations

Most ORM frameworks map boolean model fields to `TINYINT(1)` automatically. Verify your driver's behavior when reading raw query results.

```python
# Python mysql-connector-python returns 0/1 by default
# SQLAlchemy maps BOOLEAN to Python bool automatically
from sqlalchemy import Column, Boolean
class FeatureFlag(Base):
    __tablename__ = 'feature_flags'
    is_enabled = Column(Boolean, nullable=False, default=False)
```

## Summary

MySQL's `BOOLEAN` and `BOOL` types are aliases for `TINYINT(1)`, storing 0 for false and 1 for true. Use the `TRUE`/`FALSE` literals for readability, add `CHECK` constraints to enforce strict binary values, and prefer composite indexes over standalone boolean indexes for better query performance.
