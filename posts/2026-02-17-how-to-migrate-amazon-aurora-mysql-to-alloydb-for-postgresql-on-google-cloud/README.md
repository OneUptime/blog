# How to Migrate Amazon Aurora MySQL to AlloyDB for PostgreSQL on Google Cloud

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, AlloyDB, Amazon Aurora, MySQL, PostgreSQL, Database Migration, Cloud Migration

Description: A comprehensive guide to migrating from Amazon Aurora MySQL to AlloyDB for PostgreSQL on Google Cloud, including schema conversion, data migration, and application changes.

---

Migrating from Amazon Aurora MySQL to AlloyDB for PostgreSQL is not a simple lift-and-shift. You are changing both cloud providers and database engines, which means you need to handle schema conversion, SQL dialect differences, application code updates, and data migration all at once. It is a heavier lift than most cloud migrations, but AlloyDB's PostgreSQL compatibility and performance characteristics make it a compelling target.

This guide covers the full journey from planning through cutover.

## Why AlloyDB?

AlloyDB is Google Cloud's PostgreSQL-compatible database service. It is designed for high-performance transactional and analytical workloads. Compared to Aurora MySQL:

- AlloyDB offers PostgreSQL compatibility with Google's custom storage layer
- It provides columnar engine for analytical queries on transactional data
- It supports standard PostgreSQL extensions
- It integrates deeply with Google Cloud's AI/ML services

The tradeoff is that you need to convert MySQL schemas and queries to PostgreSQL syntax.

## Step 1: Assess Your Aurora MySQL Database

Start by understanding what you are working with.

```bash
# Connect to Aurora MySQL and gather database statistics
mysql -h my-aurora-cluster.cluster-abc123.us-east-1.rds.amazonaws.com -u admin -p

# Check database sizes
SELECT table_schema AS 'Database',
       ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'Size (MB)'
FROM information_schema.tables
GROUP BY table_schema;

# List tables with row counts
SELECT table_name, table_rows, engine, table_collation
FROM information_schema.tables
WHERE table_schema = 'mydb'
ORDER BY table_rows DESC;
```

Document stored procedures, triggers, views, and any MySQL-specific features you use (like ENUM types, AUTO_INCREMENT, or MySQL-specific date functions).

## Step 2: Convert the Schema

MySQL and PostgreSQL have different data types and syntax. Here are the most common conversions:

| MySQL Type | PostgreSQL Type |
|-----------|----------------|
| TINYINT(1) | BOOLEAN |
| INT AUTO_INCREMENT | SERIAL or INT GENERATED ALWAYS AS IDENTITY |
| DATETIME | TIMESTAMP |
| DOUBLE | DOUBLE PRECISION |
| TINYTEXT/TEXT/MEDIUMTEXT/LONGTEXT | TEXT |
| TINYBLOB/BLOB/MEDIUMBLOB/LONGBLOB | BYTEA |
| ENUM('a','b','c') | VARCHAR with CHECK constraint or custom type |
| JSON | JSONB |

Use the Database Migration Service schema conversion tool, or do it manually for smaller databases:

```sql
-- MySQL original
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status ENUM('pending', 'processing', 'shipped', 'delivered') DEFAULT 'pending',
    total DECIMAL(10, 2) NOT NULL,
    metadata JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status)
) ENGINE=InnoDB;

-- PostgreSQL equivalent for AlloyDB
CREATE TABLE orders (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'processing', 'shipped', 'delivered')),
    total DECIMAL(10, 2) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes separately in PostgreSQL
CREATE INDEX idx_user_id ON orders (user_id);
CREATE INDEX idx_status ON orders (status);

-- Add a trigger for updated_at (PostgreSQL does not have ON UPDATE CURRENT_TIMESTAMP)
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
```

## Step 3: Convert Stored Procedures and Functions

MySQL stored procedures need to be rewritten in PL/pgSQL.

```sql
-- MySQL stored procedure
DELIMITER //
CREATE PROCEDURE get_user_orders(IN p_user_id INT, IN p_status VARCHAR(20))
BEGIN
    SELECT * FROM orders
    WHERE user_id = p_user_id
    AND (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC;
END //
DELIMITER ;

-- PostgreSQL equivalent
CREATE OR REPLACE FUNCTION get_user_orders(
    p_user_id INT,
    p_status VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id INT,
    user_id INT,
    status VARCHAR,
    total DECIMAL,
    created_at TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT o.id, o.user_id, o.status, o.total, o.created_at
    FROM orders o
    WHERE o.user_id = p_user_id
    AND (p_status IS NULL OR o.status = p_status)
    ORDER BY o.created_at DESC;
END;
$$ LANGUAGE plpgsql;
```

## Step 4: Create the AlloyDB Cluster

Set up AlloyDB on Google Cloud.

```bash
# Create an AlloyDB cluster
gcloud alloydb clusters create my-alloydb-cluster \
  --region=us-central1 \
  --password=your-strong-password \
  --network=projects/my-project/global/networks/default

# Create the primary instance
gcloud alloydb instances create my-primary \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --instance-type=PRIMARY \
  --cpu-count=8 \
  --machine-type=n2-highmem-8

# Create a read pool instance for read replicas
gcloud alloydb instances create my-read-pool \
  --cluster=my-alloydb-cluster \
  --region=us-central1 \
  --instance-type=READ_POOL \
  --cpu-count=4 \
  --read-pool-node-count=2
```

## Step 5: Migrate Data Using Database Migration Service

Google Cloud Database Migration Service (DMS) supports MySQL to PostgreSQL migrations.

```bash
# Create a connection profile for the Aurora MySQL source
gcloud database-migration connection-profiles create aurora-source \
  --region=us-central1 \
  --display-name="Aurora MySQL Source" \
  --provider=MYSQL \
  --host=my-aurora-cluster.cluster-abc123.us-east-1.rds.amazonaws.com \
  --port=3306 \
  --username=admin \
  --password=aurora-password

# Create a connection profile for the AlloyDB destination
gcloud database-migration connection-profiles create alloydb-dest \
  --region=us-central1 \
  --display-name="AlloyDB Destination" \
  --provider=ALLOYDB \
  --alloydb-cluster=my-alloydb-cluster

# Create and start the migration job
gcloud database-migration migration-jobs create mysql-to-alloydb \
  --region=us-central1 \
  --display-name="Aurora to AlloyDB Migration" \
  --source=aurora-source \
  --destination=alloydb-dest \
  --type=CONTINUOUS
```

For manual migration of smaller databases, you can use pgloader:

```bash
# Install pgloader and run the migration
# pgloader handles type conversion and data loading in one step
pgloader mysql://admin:password@aurora-host/mydb \
         postgresql://postgres:password@alloydb-ip/mydb
```

## Step 6: Update Application SQL Queries

Common MySQL-to-PostgreSQL SQL differences you need to fix:

```sql
-- MySQL: backtick quoting
SELECT `user`.`name` FROM `user`;
-- PostgreSQL: double-quote quoting
SELECT "user"."name" FROM "user";

-- MySQL: LIMIT with offset
SELECT * FROM orders LIMIT 10, 20;
-- PostgreSQL: LIMIT/OFFSET syntax
SELECT * FROM orders LIMIT 20 OFFSET 10;

-- MySQL: IFNULL
SELECT IFNULL(email, 'none') FROM users;
-- PostgreSQL: COALESCE (works in both, but IFNULL is MySQL-only)
SELECT COALESCE(email, 'none') FROM users;

-- MySQL: GROUP_CONCAT
SELECT user_id, GROUP_CONCAT(tag SEPARATOR ', ') FROM user_tags GROUP BY user_id;
-- PostgreSQL: STRING_AGG
SELECT user_id, STRING_AGG(tag, ', ') FROM user_tags GROUP BY user_id;

-- MySQL: DATE_FORMAT
SELECT DATE_FORMAT(created_at, '%Y-%m-%d') FROM orders;
-- PostgreSQL: TO_CHAR
SELECT TO_CHAR(created_at, 'YYYY-MM-DD') FROM orders;
```

## Step 7: Update Application Connection Code

Switch your application from a MySQL driver to a PostgreSQL driver.

```python
# Old MySQL connection
import mysql.connector

conn = mysql.connector.connect(
    host='my-aurora-cluster.cluster-abc123.us-east-1.rds.amazonaws.com',
    user='admin',
    password='password',
    database='mydb'
)

# New PostgreSQL connection for AlloyDB
import psycopg2

conn = psycopg2.connect(
    host='10.0.0.5',  # AlloyDB private IP
    user='postgres',
    password='password',
    dbname='mydb',
    port=5432
)
```

If you use an ORM like SQLAlchemy, the change is minimal:

```python
# Old SQLAlchemy with MySQL
engine = create_engine('mysql+pymysql://admin:pass@aurora-host/mydb')

# New SQLAlchemy with PostgreSQL (AlloyDB)
engine = create_engine('postgresql+psycopg2://postgres:pass@alloydb-ip/mydb')
```

## Step 8: Validate and Test

Run thorough validation after the migration.

```bash
# Connect to AlloyDB and verify row counts
psql -h 10.0.0.5 -U postgres -d mydb

# Compare row counts for each table
SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;

# Run sample queries to verify data integrity
SELECT COUNT(*), MIN(created_at), MAX(created_at) FROM orders;
```

Run your application's test suite against AlloyDB to catch any SQL compatibility issues.

## Summary

Migrating from Aurora MySQL to AlloyDB is a significant undertaking because you are crossing both cloud and database engine boundaries. The schema conversion and SQL dialect changes are the most labor-intensive parts. Use Database Migration Service for the data transfer, pgloader for smaller databases, and plan extra time for testing stored procedures and complex queries. The payoff is a modern PostgreSQL-compatible database with AlloyDB's performance optimizations and deep GCP integration.
