# How to Migrate from Oracle to MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Oracle, Migration, Database, Schema Conversion

Description: Migrate your Oracle database to MySQL by converting schema, rewriting Oracle-specific SQL, and migrating data using open-source and AWS tools.

---

## Key Differences Between Oracle and MySQL

Before migrating, understand what needs to be rewritten:

| Oracle Feature | MySQL Equivalent |
|---|---|
| `SEQUENCE` | `AUTO_INCREMENT` |
| `SYSDATE` | `NOW()` |
| `NVL(x, y)` | `IFNULL(x, y)` |
| `CONNECT BY` | Recursive CTEs |
| `ROWNUM` | `LIMIT` or `ROW_NUMBER()` |
| `VARCHAR2` | `VARCHAR` |
| `NUMBER(p,s)` | `DECIMAL(p,s)` |
| PL/SQL procedures | MySQL stored procedures (different syntax) |

## Step 1 - Schema Conversion with MySQL Workbench

MySQL Workbench includes a Migration Wizard that can connect to Oracle (via JDBC) and automatically convert schema:

```bash
# Install MySQL Workbench
sudo apt-get install mysql-workbench

# Launch and use:
# Database > Migration Wizard > Source: Oracle, Target: MySQL
```

For command-line schema export from Oracle:

```bash
# Export Oracle DDL using expdp or SQL*Plus
sqlplus sys/password@orcl AS SYSDBA << EOF
SET PAGESIZE 0
SET LONG 99999
SELECT DBMS_METADATA.GET_DDL('TABLE', table_name, 'MYSCHEMA')
FROM all_tables WHERE owner = 'MYSCHEMA';
EXIT;
EOF
```

## Step 2 - Common Schema Conversions

Convert Oracle sequences to AUTO_INCREMENT:

```sql
-- Oracle
CREATE SEQUENCE orders_seq START WITH 1 INCREMENT BY 1;

-- MySQL
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  ...
);
```

Convert Oracle `SYSDATE` and `DUAL`:

```sql
-- Oracle
SELECT SYSDATE FROM DUAL;

-- MySQL
SELECT NOW();
```

Convert Oracle `NVL` and `DECODE`:

```sql
-- Oracle
SELECT NVL(phone, 'N/A') FROM customers;
SELECT DECODE(status, 'A', 'Active', 'I', 'Inactive', 'Unknown') FROM orders;

-- MySQL
SELECT IFNULL(phone, 'N/A') FROM customers;
SELECT CASE status WHEN 'A' THEN 'Active' WHEN 'I' THEN 'Inactive' ELSE 'Unknown' END FROM orders;
```

## Step 3 - Migrate Data with sqoop or CSV Export

Export Oracle table data to CSV:

```bash
# Using Oracle's spool
sqlplus user/pass@orcl << EOF
SET COLSEP ','
SET PAGESIZE 0
SET TRIMSPOOL ON
SET FEEDBACK OFF
SPOOL /tmp/orders.csv
SELECT id, customer_id, total, created_at FROM orders;
SPOOL OFF
EXIT;
EOF
```

Import into MySQL:

```sql
LOAD DATA INFILE '/tmp/orders.csv'
INTO TABLE orders
FIELDS TERMINATED BY ','
LINES TERMINATED BY '\n'
(id, customer_id, total, created_at);
```

## Step 4 - Rewriting PL/SQL to MySQL Stored Procedures

Oracle PL/SQL:

```sql
CREATE OR REPLACE PROCEDURE update_salary(emp_id NUMBER, new_sal NUMBER) AS
BEGIN
  UPDATE employees SET salary = new_sal WHERE id = emp_id;
  COMMIT;
END;
```

MySQL equivalent:

```sql
DELIMITER $$
CREATE PROCEDURE update_salary(IN emp_id INT, IN new_sal DECIMAL(10,2))
BEGIN
  UPDATE employees SET salary = new_sal WHERE id = emp_id;
END$$
DELIMITER ;
```

## Step 5 - Validate the Migration

```sql
-- Compare row counts
SELECT COUNT(*) FROM orders;
-- Match against Oracle: SELECT COUNT(*) FROM orders;

-- Spot-check data
SELECT * FROM orders ORDER BY id DESC LIMIT 10;
```

## Summary

Migrating from Oracle to MySQL requires systematic schema conversion (sequences, data types, functions), rewriting Oracle-specific SQL constructs, and converting PL/SQL to MySQL's stored procedure syntax. MySQL Workbench's Migration Wizard automates schema conversion while CSV export/import handles data transfer for most scenarios.
