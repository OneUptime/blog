# What Is MySQL Workbench

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, MySQL Workbench, GUI, Database Design, Administration

Description: MySQL Workbench is the official graphical tool for MySQL database design, SQL development, server administration, and data migration.

---

## Overview

MySQL Workbench is the official cross-platform graphical user interface (GUI) for MySQL. It provides an integrated environment for database designers, developers, and administrators. The tool covers three main areas: SQL development and query execution, database modeling and schema design, and server administration and monitoring.

MySQL Workbench runs on Windows, macOS, and Linux and connects to both local and remote MySQL instances.

## Key Features

**SQL Editor**: Write and execute SQL queries with syntax highlighting, code completion, query history, and result set editing. Multiple tabs let you work on several queries simultaneously.

**Visual EXPLAIN**: Execute a query with EXPLAIN and view the execution plan as an interactive visual diagram rather than raw text output.

**EER Diagram (Enhanced Entity-Relationship)**: Design database schemas visually by dragging and connecting tables. Forward-engineering generates `CREATE TABLE` DDL from the diagram; reverse-engineering imports an existing schema into a diagram.

**Server Administration**: Manage user accounts, privileges, server configuration variables, and service start/stop without writing SQL.

## Connecting to a MySQL Instance

Launch Workbench and add a new connection:

```text
Host: 127.0.0.1
Port: 3306
Username: root
Connection Method: Standard TCP/IP
```

For remote servers, use the SSH Tunnel connection method or configure SSL.

## Running Queries

The SQL Editor provides a familiar IDE experience:

```sql
-- Press Ctrl+Enter to execute the statement under cursor
SELECT
  c.name AS customer,
  COUNT(o.id) AS order_count,
  SUM(o.total) AS total_spent
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id
ORDER BY total_spent DESC
LIMIT 20;
```

Results appear in a grid below the editor. You can export them to CSV, JSON, or Excel directly from the context menu.

## Visual EXPLAIN

Click the lightning bolt with a magnifying glass icon (or use Query > Explain Current Statement) to run EXPLAIN and view the visual plan:

```sql
EXPLAIN SELECT * FROM orders
WHERE customer_id = 42
AND status = 'pending';
```

Workbench renders each step of the plan as a node, color-coded by cost, making it easy to spot full table scans and missing indexes.

## Database Modeling

Create a new EER model under File > New Model. Add tables, columns, data types, indexes, and foreign key relationships graphically. Then use Database > Forward Engineer to generate and execute the DDL:

```sql
-- Workbench generates CREATE TABLE statements
CREATE TABLE `orders` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `customer_id` INT NOT NULL,
  `total` DECIMAL(10,2) NOT NULL,
  `status` ENUM('pending','shipped','cancelled') NOT NULL DEFAULT 'pending',
  PRIMARY KEY (`id`),
  INDEX `fk_customer_idx` (`customer_id`),
  CONSTRAINT `fk_customer` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
) ENGINE=InnoDB;
```

## Data Export and Import

Use Server > Data Export to export databases or specific tables to a self-contained dump file or separate SQL files. The same dialog handles import via Server > Data Import.

## Performance Reports

The Server > Performance Reports section uses the `sys` schema to display pre-built reports on top queries by execution time, I/O hotspots, index usage, and more, without writing SQL.

## Summary

MySQL Workbench provides a comprehensive graphical environment for all aspects of MySQL work. Its SQL editor, visual EXPLAIN, schema modeler, and administration panels make it accessible to beginners while offering enough depth for experienced DBAs. It is the recommended GUI tool for MySQL and works with all MySQL 5.7 and 8.x versions.
