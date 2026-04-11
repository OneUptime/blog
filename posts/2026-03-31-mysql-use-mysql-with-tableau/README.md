# How to Use MySQL with Tableau

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Tableau, Data Visualization

Description: Connect Tableau Desktop and Tableau Server to MySQL, configure live vs extract connections, optimize queries, and secure access with read-only credentials.

---

Tableau connects to MySQL through its built-in connector, offering both live queries and extracted data modes. Choosing the right mode and preparing MySQL correctly determines dashboard responsiveness.

## Prerequisites

Tableau Desktop (2021.4+) includes a native MySQL connector. Install the MySQL Connector/ODBC 8.0 driver on both macOS and Windows before connecting.

## Creating a Read-Only MySQL Account

```sql
CREATE USER 'tableau_ro'@'%' IDENTIFIED BY 'readonlypassword';
GRANT SELECT ON warehouse_db.* TO 'tableau_ro'@'%';
FLUSH PRIVILEGES;
```

Restrict the `%` host to the specific Tableau Server IP in production.

## Connecting Tableau Desktop to MySQL

1. Open Tableau Desktop
2. Connect > To a Server > MySQL
3. Enter server hostname, port (3306), database name
4. Enter username: `tableau_ro`, password
5. Click Sign In

## Live vs Extract Connection

Live queries hit MySQL on every user interaction. Extracts are snapshots stored in Tableau's `.hyper` format.

Use live when:
- Data changes frequently (under 1 hour latency acceptable)
- Dataset fits in MySQL indexes efficiently

Use extract when:
- Dashboard load time matters more than freshness
- Aggregating millions of rows that MySQL is slow to summarize repeatedly

## Custom SQL for Complex Joins

In the data source pane, use Custom SQL:

```sql
SELECT
    o.id          AS order_id,
    o.created_at  AS order_date,
    c.name        AS customer_name,
    p.category    AS product_category,
    oi.quantity   * oi.unit_price AS line_total
FROM orders o
JOIN customers  c  ON c.id = o.customer_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products   p  ON p.id = oi.product_id
WHERE o.created_at >= DATE_SUB(NOW(), INTERVAL 2 YEAR);
```

## Optimizing MySQL for Tableau Queries

Tableau generates GROUP BY queries with multiple dimensions. Index the columns Tableau filters on:

```sql
-- Support Tableau date filters
ALTER TABLE orders ADD INDEX idx_created_at (created_at);

-- Support dimension group-by
ALTER TABLE order_items ADD INDEX idx_product_id (product_id);
```

Check what Tableau is sending to MySQL by enabling the performance recorder in Tableau Desktop (Help > Settings and Performance > Start Performance Recording).

## Tableau Server Data Source Permissions

On Tableau Server, restrict Published Data Sources to specific groups and use row-level security via calculated fields that reference `USERNAME()`:

```text
[customer_id] = INT(USERNAME())
```

## Summary

Tableau connects to MySQL through a built-in native connector using a read-only account. Use live connections for frequently updated data and extracts for large aggregation-heavy dashboards. Index the date and dimension columns Tableau filters on, and use Custom SQL to push complex joins into MySQL rather than relying on Tableau's join engine.
