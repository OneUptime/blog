# How to Use MySQL with Metabase for Business Intelligence

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Metabase, Business Intelligence

Description: Connect Metabase to MySQL, configure read-only credentials, write native SQL questions, and build dashboards from MySQL data.

---

Metabase is an open-source business intelligence tool that connects directly to MySQL, allowing non-technical users to explore data through a visual query builder and technical users to write native SQL. Setting up MySQL correctly ensures fast, secure dashboards.

## Creating a Read-Only MySQL User for Metabase

Never connect Metabase with a root or write-capable account. Use a dedicated read-only user:

```sql
CREATE USER 'metabase_ro'@'%' IDENTIFIED BY 'readonlypassword';
GRANT SELECT ON app_db.* TO 'metabase_ro'@'%';
FLUSH PRIVILEGES;
```

The `%` wildcard allows connections from the Metabase server IP - narrow this to the specific IP in production.

## Connecting Metabase to MySQL

In Metabase: Admin > Databases > Add Database.

- Database type: MySQL
- Host: your MySQL host
- Port: 3306
- Database name: app_db
- Username: metabase_ro
- Password: readonlypassword

Or configure via environment variables when running Metabase in Docker:

```yaml
services:
  metabase:
    image: metabase/metabase:latest
    environment:
      MB_DB_TYPE: mysql
      MB_DB_HOST: mysql
      MB_DB_PORT: 3306
      MB_DB_DBNAME: metabase_db
      MB_DB_USER: metabase_app
      MB_DB_PASS: metabasepassword
```

Note: `MB_DB_*` variables configure Metabase's own application database, not the data source you analyze.

## Writing Native SQL Questions

```sql
-- Monthly revenue trend
SELECT
    DATE_FORMAT(created_at, '%Y-%m') AS month,
    SUM(total_amount)                AS revenue,
    COUNT(*)                         AS order_count
FROM orders
WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
GROUP BY month
ORDER BY month ASC;
```

Save this as a "Question" in Metabase and pin it to a dashboard.

## Performance: Adding Indexes for Dashboard Queries

Dashboard queries often filter by date ranges and aggregate by category. Add targeted indexes:

```sql
-- For date-range aggregation queries
ALTER TABLE orders ADD INDEX idx_created_at (created_at);

-- For multi-column filters
ALTER TABLE orders ADD INDEX idx_status_created (status, created_at);
```

## Scheduling Automatic Syncs

Metabase scans your MySQL schema periodically. Tune scan frequency in Admin > Databases > your database > Scheduling. For large databases, reduce scan frequency and disable fingerprinting on large tables.

## Checking Query Performance

```sql
-- Find slow queries Metabase is generating
SELECT query_time, sql_text
FROM mysql.slow_log
WHERE sql_text LIKE '%orders%'
ORDER BY query_time DESC
LIMIT 10;
```

Enable slow query log in MySQL and direct output to the table for this to work: `SET GLOBAL slow_query_log = 'ON'; SET GLOBAL log_output = 'TABLE'; SET GLOBAL long_query_time = 1;`

## Summary

Metabase connects to MySQL through a dedicated read-only user, providing a safe BI layer over production data. Add indexes for common dashboard filter patterns, monitor slow queries, and use Metabase's native SQL editor for complex aggregations that the visual builder cannot express.
