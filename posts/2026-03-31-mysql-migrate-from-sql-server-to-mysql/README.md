# How to Migrate from SQL Server to MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, SQL Server, Migration, SSMA, Database

Description: Migrate a Microsoft SQL Server database to MySQL by converting schema with SSMA, handling T-SQL differences, and transferring data reliably.

---

## Key Differences Between SQL Server and MySQL

| SQL Server Feature | MySQL Equivalent |
|---|---|
| `IDENTITY(1,1)` | `AUTO_INCREMENT` |
| `GETDATE()` | `NOW()` |
| `ISNULL(x, y)` | `IFNULL(x, y)` |
| `TOP N` | `LIMIT N` |
| `NVARCHAR` | `VARCHAR` with `utf8mb4` |
| `DATETIME2` | `DATETIME(6)` |
| `BIT` | `TINYINT(1)` or `BOOLEAN` |
| T-SQL stored procedures | MySQL stored procedures |
| `GO` batch separator | Not needed in MySQL |

## Step 1 - Schema Conversion with MySQL Workbench

MySQL Workbench Migration Wizard is a free tool that automates schema conversion from SQL Server to MySQL:

```text
1. Download MySQL Workbench from dev.mysql.com
2. Open Database > Migration Wizard
3. Connect to SQL Server as source (via ODBC)
4. Connect to MySQL as target
5. Select schemas and objects to migrate
6. Review the generated MySQL schema
7. Run the migration
```

MySQL Workbench generates a migration report highlighting objects that need manual intervention.

## Step 2 - Manual Schema Fixes

Convert IDENTITY columns:

```sql
-- SQL Server
CREATE TABLE orders (
  id INT IDENTITY(1,1) PRIMARY KEY,
  customer_id INT NOT NULL,
  total MONEY NOT NULL
);

-- MySQL
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  total DECIMAL(19,4) NOT NULL
);
```

Convert NVARCHAR to VARCHAR with utf8mb4:

```sql
-- SQL Server
name NVARCHAR(100) NOT NULL

-- MySQL
name VARCHAR(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL
```

## Step 3 - Rewriting T-SQL Functions

Common T-SQL to MySQL function conversions:

```sql
-- SQL Server: string functions
LEN(col)           -> CHAR_LENGTH(col)
CHARINDEX(x, y)    -> LOCATE(x, y)
SUBSTRING(s, 1, 5) -> SUBSTRING(s, 1, 5)  -- same
CONVERT(VARCHAR, d, 120) -> DATE_FORMAT(d, '%Y-%m-%d %H:%i:%s')

-- SQL Server: date functions
DATEADD(day, 7, GETDATE())  -> DATE_ADD(NOW(), INTERVAL 7 DAY)
DATEDIFF(day, d1, d2)       -> DATEDIFF(d2, d1)  -- days only, reversed arg order
-- For non-day units use TIMESTAMPDIFF:
-- DATEDIFF(month, d1, d2)  -> TIMESTAMPDIFF(MONTH, d1, d2)
YEAR(d), MONTH(d), DAY(d) -> YEAR(d), MONTH(d), DAY(d)  -- same
```

## Step 4 - Converting T-SQL Stored Procedures

SQL Server T-SQL:

```sql
CREATE PROCEDURE GetOrdersByCustomer
  @CustomerID INT
AS
BEGIN
  SET NOCOUNT ON;
  SELECT * FROM orders WHERE customer_id = @CustomerID;
END;
```

MySQL equivalent:

```sql
DELIMITER $$
CREATE PROCEDURE GetOrdersByCustomer(IN p_CustomerID INT)
BEGIN
  SELECT * FROM orders WHERE customer_id = p_CustomerID;
END$$
DELIMITER ;
```

## Step 5 - Data Export from SQL Server

```bash
# Export using bcp (Bulk Copy Program)
bcp mydb.dbo.orders out /tmp/orders.dat -c -t',' -r'\n' \
  -S sqlserver.example.com -U sa -P 'Password!'
```

Import into MySQL:

```sql
LOAD DATA INFILE '/tmp/orders.dat'
INTO TABLE orders
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
(id, customer_id, total, created_at);
```

## Step 6 - Validate Row Counts and Checksums

```sql
-- In MySQL
SELECT TABLE_NAME, TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'myapp'
ORDER BY TABLE_NAME;
```

Compare against SQL Server:

```sql
-- In SQL Server
SELECT t.name, p.rows
FROM sys.tables t
JOIN sys.partitions p ON t.object_id = p.object_id
WHERE p.index_id < 2
ORDER BY t.name;
```

## Summary

Migrating from SQL Server to MySQL requires converting IDENTITY columns to AUTO_INCREMENT, replacing T-SQL functions with MySQL equivalents, rewriting stored procedures without T-SQL syntax, and handling NVARCHAR/unicode with utf8mb4. MySQL Workbench Migration Wizard automates most schema conversion, but stored procedures and complex T-SQL logic require manual review and rewriting.
