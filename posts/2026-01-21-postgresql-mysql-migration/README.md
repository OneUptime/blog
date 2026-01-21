# How to Migrate from MySQL to PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, MySQL, Migration, Schema Conversion, Data Migration

Description: A guide to migrating from MySQL to PostgreSQL, covering schema conversion, data migration, and handling differences between the databases.

---

Migrating from MySQL to PostgreSQL requires careful planning for schema and data conversion. This guide covers the process.

## Schema Differences

| MySQL | PostgreSQL |
|-------|------------|
| AUTO_INCREMENT | SERIAL/IDENTITY |
| UNSIGNED | CHECK constraint |
| ENUM | CREATE TYPE |
| TINYINT(1) | BOOLEAN |
| DATETIME | TIMESTAMP |
| DOUBLE | DOUBLE PRECISION |

## Tools for Migration

### pgloader

```bash
# Install pgloader
sudo apt install pgloader

# Migrate database
pgloader mysql://user:pass@localhost/mydb postgresql://user:pass@localhost/mydb
```

### pgloader Configuration

```lisp
LOAD DATABASE
    FROM mysql://root:password@localhost/mysql_db
    INTO postgresql://postgres:password@localhost/pg_db

WITH include drop, create tables, create indexes, reset sequences

SET work_mem to '128MB', maintenance_work_mem to '512MB'

CAST type tinyint to boolean using tinyint-to-boolean
;
```

## Manual Schema Conversion

### AUTO_INCREMENT to SERIAL

```sql
-- MySQL
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY
);

-- PostgreSQL
CREATE TABLE users (
    id SERIAL PRIMARY KEY
);

-- Or PostgreSQL 10+ IDENTITY
CREATE TABLE users (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY
);
```

### ENUM Conversion

```sql
-- MySQL
CREATE TABLE orders (
    status ENUM('pending', 'shipped', 'delivered')
);

-- PostgreSQL
CREATE TYPE order_status AS ENUM ('pending', 'shipped', 'delivered');
CREATE TABLE orders (
    status order_status
);
```

### UNSIGNED Handling

```sql
-- MySQL
CREATE TABLE items (
    quantity INT UNSIGNED
);

-- PostgreSQL
CREATE TABLE items (
    quantity INTEGER CHECK (quantity >= 0)
);
```

## Data Migration

### Export from MySQL

```bash
# Export data as INSERT statements
mysqldump --compatible=postgresql --no-create-info mydb > data.sql

# Or CSV export
mysql -e "SELECT * FROM users" mydb > users.csv
```

### Import to PostgreSQL

```bash
# Import CSV
psql -c "COPY users FROM '/path/to/users.csv' CSV HEADER" mydb

# Import SQL (may need modifications)
psql mydb < data.sql
```

## Query Differences

```sql
-- MySQL: LIMIT with OFFSET
SELECT * FROM users LIMIT 10, 20;

-- PostgreSQL: OFFSET LIMIT
SELECT * FROM users LIMIT 20 OFFSET 10;

-- MySQL: String concatenation
SELECT CONCAT(first_name, ' ', last_name) FROM users;

-- PostgreSQL: Also supports || operator
SELECT first_name || ' ' || last_name FROM users;
```

## Testing Migration

1. **Compare row counts** - All tables
2. **Verify data types** - Check conversions
3. **Test application queries** - Run full test suite
4. **Performance testing** - Compare query times

## Best Practices

1. **Test thoroughly** - Staging environment first
2. **Plan downtime** - Or use replication
3. **Convert incrementally** - Table by table
4. **Keep MySQL running** - Until verified
5. **Update application** - Query syntax changes

## Conclusion

Migration from MySQL to PostgreSQL requires schema conversion and data migration. Use pgloader for automated migration or convert manually for full control.
