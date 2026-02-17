# How to Migrate On-Premises Oracle Database to Cloud SQL for PostgreSQL on GCP

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud SQL, PostgreSQL, Oracle, Database Migration

Description: A step-by-step guide for migrating an on-premises Oracle database to Cloud SQL for PostgreSQL on Google Cloud Platform.

---

Migrating from Oracle to PostgreSQL is one of the most common database migrations I see teams undertake when moving to Google Cloud. The motivation is usually a combination of licensing cost savings and wanting to run on a managed service. Cloud SQL for PostgreSQL handles the operational heavy lifting - backups, patching, replication, failover - while PostgreSQL itself is mature enough to handle most workloads that previously ran on Oracle. But the migration is not trivial. Here is how to approach it.

## Assess Your Oracle Database First

Before writing any migration code, you need to understand what you are working with. The Oracle database likely uses features that do not have direct equivalents in PostgreSQL. Identifying these early saves pain later.

Key things to inventory:

- **PL/SQL stored procedures and functions** - these need to be rewritten in PL/pgSQL
- **Oracle-specific data types** - NUMBER, VARCHAR2, DATE (which includes time), CLOB, BLOB
- **Sequences and triggers** - PostgreSQL has equivalents but with different syntax
- **Materialized views** - supported in PostgreSQL but with different refresh mechanics
- **Oracle-specific SQL syntax** - CONNECT BY, DECODE, NVL, ROWNUM, outer join (+) syntax
- **Database links** - PostgreSQL uses foreign data wrappers instead
- **Partitioning** - PostgreSQL supports declarative partitioning but differently from Oracle

Google provides the Database Migration Assessment Tool to help with this:

```bash
# Install the migration assessment tool
gcloud components install database-migration

# Run an assessment against your Oracle database
gcloud database-migration conversion-workspaces create my-assessment \
  --region us-central1 \
  --source-connection-profile oracle-source \
  --destination-connection-profile cloudsql-dest
```

## Set Up Cloud SQL for PostgreSQL

Create your target Cloud SQL instance with enough resources to handle the migrated workload:

```bash
# Create a Cloud SQL PostgreSQL instance
gcloud sql instances create my-postgres-instance \
  --database-version POSTGRES_15 \
  --tier db-custom-8-32768 \
  --region us-central1 \
  --availability-type REGIONAL \
  --storage-type SSD \
  --storage-size 500GB \
  --storage-auto-increase \
  --backup-start-time 02:00 \
  --enable-point-in-time-recovery \
  --maintenance-window-day SAT \
  --maintenance-window-hour 4

# Create the target database
gcloud sql databases create myapp --instance my-postgres-instance

# Set up the database user
gcloud sql users create app_user \
  --instance my-postgres-instance \
  --password "secure-password-here"
```

## Schema Conversion

The schema conversion is typically the most labor-intensive part. Oracle and PostgreSQL have different type systems, different constraint syntax, and different default behaviors.

Here are common Oracle-to-PostgreSQL type mappings:

```sql
-- Oracle type mappings to PostgreSQL equivalents
-- NUMBER(10)        -> BIGINT or INTEGER
-- NUMBER(10,2)      -> NUMERIC(10,2)
-- VARCHAR2(100)     -> VARCHAR(100)
-- DATE              -> TIMESTAMP (Oracle DATE includes time)
-- CLOB              -> TEXT
-- BLOB              -> BYTEA
-- RAW(16)           -> BYTEA
-- LONG              -> TEXT
-- BINARY_FLOAT      -> REAL
-- BINARY_DOUBLE     -> DOUBLE PRECISION

-- Example Oracle table
-- CREATE TABLE orders (
--   order_id NUMBER(10) PRIMARY KEY,
--   customer_id NUMBER(10) NOT NULL,
--   order_date DATE DEFAULT SYSDATE,
--   total_amount NUMBER(12,2),
--   status VARCHAR2(20) DEFAULT 'PENDING',
--   notes CLOB
-- );

-- Equivalent PostgreSQL table
CREATE TABLE orders (
    order_id BIGINT PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(12,2),
    status VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT
);

-- Oracle sequence and trigger for auto-increment
-- becomes a PostgreSQL IDENTITY column or SERIAL
CREATE TABLE orders (
    order_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount NUMERIC(12,2),
    status VARCHAR(20) DEFAULT 'PENDING',
    notes TEXT
);
```

## PL/SQL to PL/pgSQL Conversion

Oracle PL/SQL procedures need to be rewritten in PostgreSQL's PL/pgSQL. The languages are similar but have meaningful differences:

```sql
-- Oracle PL/SQL procedure
-- CREATE OR REPLACE PROCEDURE update_order_status(
--   p_order_id IN NUMBER,
--   p_new_status IN VARCHAR2
-- ) AS
-- BEGIN
--   UPDATE orders SET status = p_new_status
--   WHERE order_id = p_order_id;
--   IF SQL%ROWCOUNT = 0 THEN
--     RAISE_APPLICATION_ERROR(-20001, 'Order not found');
--   END IF;
--   COMMIT;
-- END;

-- PostgreSQL PL/pgSQL equivalent
CREATE OR REPLACE PROCEDURE update_order_status(
    p_order_id BIGINT,
    p_new_status VARCHAR
)
LANGUAGE plpgsql
AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE orders SET status = p_new_status
    WHERE order_id = p_order_id;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    IF rows_affected = 0 THEN
        RAISE EXCEPTION 'Order not found: %', p_order_id;
    END IF;

    -- Note: PostgreSQL procedures support COMMIT since version 11
    COMMIT;
END;
$$;
```

Common syntax differences to watch for:

- `NVL(a, b)` becomes `COALESCE(a, b)`
- `SYSDATE` becomes `CURRENT_TIMESTAMP`
- `DECODE(x, a, b, c, d, e)` becomes a `CASE WHEN` expression
- `ROWNUM` becomes `ROW_NUMBER() OVER()` or `LIMIT`
- `CONNECT BY` hierarchical queries use recursive CTEs in PostgreSQL
- `||` for string concatenation works the same in both

## Data Migration with Database Migration Service

Google's Database Migration Service (DMS) can handle the actual data transfer:

```bash
# Create a source connection profile for Oracle
gcloud database-migration connection-profiles create oracle-source \
  --region us-central1 \
  --type ORACLE \
  --host 192.168.1.100 \
  --port 1521 \
  --username migration_user \
  --password "oracle-password" \
  --database-service ORCL

# Create a destination connection profile for Cloud SQL
gcloud database-migration connection-profiles create cloudsql-dest \
  --region us-central1 \
  --type CLOUDSQL \
  --cloudsql-instance my-postgres-instance

# Create and start the migration job
gcloud database-migration migration-jobs create oracle-to-postgres \
  --region us-central1 \
  --source oracle-source \
  --destination cloudsql-dest \
  --type CONTINUOUS
```

## Testing the Migration

Do not skip testing. Run your application's test suite against the PostgreSQL database and compare results with Oracle. Pay attention to:

1. **Date and timestamp handling** - Oracle's DATE type includes time, which catches people off guard
2. **NULL handling in strings** - Oracle treats empty strings as NULL, PostgreSQL does not
3. **Case sensitivity** - Oracle identifiers are uppercase by default, PostgreSQL lowercases them
4. **Numeric precision** - verify that financial calculations produce identical results
5. **Transaction behavior** - PostgreSQL's default transaction isolation is Read Committed, same as Oracle's default

```bash
# Run a data comparison query to verify row counts
psql -h <cloud-sql-ip> -U app_user -d myapp -c "
SELECT 'orders' as table_name, COUNT(*) as row_count FROM orders
UNION ALL
SELECT 'customers', COUNT(*) FROM customers
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items
ORDER BY table_name;
"
```

## Cutover Strategy

Plan the cutover carefully to minimize downtime:

1. Run continuous replication with DMS until the target is in sync
2. Stop writes to the Oracle database
3. Wait for DMS to catch up with the final changes
4. Verify data consistency between source and target
5. Point your application to Cloud SQL
6. Monitor closely for the first 24-48 hours
7. Keep the Oracle database available as a rollback option for at least a week

## Common Pitfalls

- **Underestimating PL/SQL conversion effort.** Complex Oracle applications can have thousands of stored procedures. Budget time accordingly.
- **Ignoring Oracle-specific optimizer hints.** PostgreSQL has its own query planner, and queries that were tuned for Oracle may need re-tuning.
- **Forgetting about collation differences.** Oracle's default sort order may differ from PostgreSQL's. Test sort-dependent queries.
- **Not testing with production-scale data.** A migration that works fine with test data can fail or perform poorly with production volumes.

The Oracle-to-PostgreSQL migration is a significant undertaking, but the end result - a managed database with no licensing costs and full GCP integration - makes it worthwhile for most teams.
