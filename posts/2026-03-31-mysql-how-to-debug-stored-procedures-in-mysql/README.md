# How to Debug Stored Procedures in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Debugging, SQL, Development

Description: Learn practical techniques for debugging MySQL stored procedures using SELECT logging, temporary tables, error handlers, and external tools.

---

## Why MySQL Lacks a Built-In Debugger

Unlike Oracle PL/SQL or SQL Server T-SQL, MySQL does not include a native stored procedure debugger in the server itself. Debugging relies on instrumentation techniques: printing values at key points, writing to log tables, or using external tools.

## Technique 1 - Debug with SELECT Statements

The simplest approach is inserting `SELECT` statements to print variable values at different points:

```sql
DELIMITER //

CREATE PROCEDURE DebugExample(IN p_customer_id INT)
BEGIN
  DECLARE v_count INT;
  DECLARE v_total DECIMAL(12, 2);

  SELECT 'Starting procedure' AS debug_msg;

  SELECT COUNT(*), SUM(total_amount)
  INTO v_count, v_total
  FROM orders
  WHERE customer_id = p_customer_id;

  SELECT v_count AS debug_count, v_total AS debug_total;

  IF v_count > 0 THEN
    SELECT 'Customer has orders - proceeding' AS debug_msg;
    -- rest of logic
  END IF;
END //

DELIMITER ;
```

Call the procedure to see debug output:

```sql
CALL DebugExample(42);
```

## Technique 2 - Write to a Debug Log Table

For production-safe debugging, write to a dedicated log table instead of SELECT:

```sql
CREATE TABLE IF NOT EXISTS proc_debug_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  proc_name VARCHAR(100),
  step_name VARCHAR(100),
  message TEXT,
  logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

```sql
DELIMITER //

CREATE PROCEDURE LoggedProcedure(IN p_id INT)
BEGIN
  DECLARE v_status VARCHAR(50);

  INSERT INTO proc_debug_log (proc_name, step_name, message)
  VALUES ('LoggedProcedure', 'start', CONCAT('Processing id=', p_id));

  SELECT status INTO v_status FROM orders WHERE id = p_id;

  INSERT INTO proc_debug_log (proc_name, step_name, message)
  VALUES ('LoggedProcedure', 'after_select', CONCAT('Status=', IFNULL(v_status, 'NULL')));

  -- ... rest of procedure

  INSERT INTO proc_debug_log (proc_name, step_name, message)
  VALUES ('LoggedProcedure', 'end', 'Completed successfully');
END //

DELIMITER ;
```

```sql
CALL LoggedProcedure(101);
SELECT * FROM proc_debug_log ORDER BY id DESC LIMIT 20;
```

## Technique 3 - Use a Conditional Debug Flag

Add an input parameter to control debug output:

```sql
DELIMITER //

CREATE PROCEDURE ProcessOrders(
  IN p_status VARCHAR(20),
  IN p_debug TINYINT
)
BEGIN
  DECLARE v_count INT DEFAULT 0;

  SELECT COUNT(*) INTO v_count
  FROM orders WHERE status = p_status;

  IF p_debug = 1 THEN
    SELECT CONCAT('Found ', v_count, ' orders with status=', p_status) AS debug_info;
  END IF;

  -- actual processing logic here
END //

DELIMITER ;
```

```sql
-- Debug mode on
CALL ProcessOrders('pending', 1);

-- Production mode
CALL ProcessOrders('pending', 0);
```

## Technique 4 - SIGNAL for Custom Errors

Use `SIGNAL` to raise a custom exception with a descriptive message, which stops execution and surfaces the state:

```sql
DELIMITER //

CREATE PROCEDURE ValidateAndProcess(IN p_amount DECIMAL(10, 2))
BEGIN
  IF p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'Amount must be positive',
          MYSQL_ERRNO = 1644;
  END IF;

  -- Continue with valid amount
  SELECT CONCAT('Processing amount: ', p_amount) AS result;
END //

DELIMITER ;
```

```sql
CALL ValidateAndProcess(-5.00);
-- ERROR 1644 (45000): Amount must be positive
```

## Technique 5 - MySQL Workbench Debugger

MySQL Workbench 6.x (Commercial Edition) included a stored procedure debugger with breakpoints and step-through execution:

1. Open MySQL Workbench and connect to your server.
2. Open the stored procedure in the SQL editor.
3. Right-click and select "Debug Stored Procedure".
4. Use the toolbar to set breakpoints, step over/into, and inspect variables.

Note: The stored procedure debugger was removed in MySQL Workbench 8.0 and is no longer available in current versions.

## Technique 6 - dbForge Studio Debugger

dbForge Studio for MySQL provides a full-featured debugger with:
- Breakpoints on any SQL statement
- Variable watch windows
- Call stack inspection
- Step-in and step-out support

## Inspecting Procedure Errors via General Query Log

Enable general query logging to see all queries executed inside procedures:

```sql
SET GLOBAL general_log = ON;
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
```

Then call the procedure and review the log:

```bash
tail -f /var/log/mysql/general.log
```

Disable logging after debugging:

```sql
SET GLOBAL general_log = OFF;
```

## Summary

MySQL stored procedure debugging relies on instrumentation: use inline `SELECT` statements for quick checks during development, write to a debug log table for persistent tracing, and add a debug flag parameter to toggle verbose output in production. Use `SIGNAL` to raise descriptive custom errors that expose state at failure points. For graphical debugging, MySQL Workbench or dbForge Studio provide breakpoint-based debuggers.
