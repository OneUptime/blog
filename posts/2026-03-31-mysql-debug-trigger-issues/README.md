# How to Debug Trigger Issues in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, Debugging, Troubleshooting, Error

Description: Learn practical techniques to debug MySQL trigger problems including silent failures, unexpected errors, and identifying which trigger is causing an issue.

---

Debugging MySQL triggers is challenging because they fire implicitly during DML statements and their output is not directly visible to the client. This guide covers the most effective techniques for diagnosing trigger problems.

## Technique 1 - Isolate the Trigger by Disabling DML

Test whether a trigger is causing an issue by running the DML with and without the triggering table:

```sql
-- Check all triggers on the problem table
SHOW TRIGGERS LIKE 'orders';
```

If you need to temporarily bypass triggers, the only safe way in MySQL is to drop the trigger, test, then recreate it. MySQL does not have a "disable trigger" command like SQL Server.

## Technique 2 - Write Debug Output to a Log Table

Because triggers cannot output to the client, write debug values to a dedicated log table:

```sql
CREATE TABLE trigger_debug_log (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    trigger_name VARCHAR(64),
    message    TEXT,
    logged_at  DATETIME(3) DEFAULT NOW(3)
);

DELIMITER //

CREATE TRIGGER trg_orders_debug
BEFORE INSERT ON orders
FOR EACH ROW
BEGIN
    INSERT INTO trigger_debug_log (trigger_name, message)
    VALUES (
        'trg_orders_debug',
        CONCAT('NEW.user_id=', IFNULL(NEW.user_id,'NULL'),
               ' NEW.total=', IFNULL(NEW.total,'NULL'))
    );
END //

DELIMITER ;
```

After running the failing DML:

```sql
SELECT * FROM trigger_debug_log ORDER BY logged_at DESC LIMIT 10;
```

## Technique 3 - Read the Error Message Carefully

When a trigger raises a SQL error the message often contains enough information:

```sql
INSERT INTO orders (user_id, total) VALUES (999, -5.00);
```

```text
ERROR 1644 (45000): Total amount cannot be negative
```

The error points to a `SIGNAL` inside the trigger. Use `SHOW CREATE TRIGGER` to read the trigger body:

```sql
SHOW CREATE TRIGGER trg_orders_before_insert\G
```

## Technique 4 - Check the Error Log

Runtime errors inside triggers that are caught by a `CONTINUE HANDLER` may be silently swallowed. Check MySQL's error log for warnings:

```bash
tail -100 /var/log/mysql/error.log
```

Enable general query logging temporarily to see the exact DML statements from clients that cause trigger-related failures:

```sql
SET GLOBAL general_log = 'ON';
SET GLOBAL general_log_file = '/var/log/mysql/general.log';
```

After debugging:

```sql
SET GLOBAL general_log = 'OFF';
```

Note that the general query log only records statements received from clients, not the individual statements that execute inside trigger bodies. To trace trigger internals at runtime, use the Performance Schema `events_statements_history` table or the debug log table approach from Technique 2.

## Technique 5 - Reproduce the Trigger Body as a Procedure

Copy the trigger body into a stored procedure and call it with specific values to test interactively:

```sql
DELIMITER //

CREATE PROCEDURE debug_trigger_logic(IN p_user_id INT, IN p_total DECIMAL(10,2))
BEGIN
    -- Paste trigger body here
    IF p_total < 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Total amount cannot be negative';
    END IF;
END //

DELIMITER ;

CALL debug_trigger_logic(1, -5.00);
```

## Technique 6 - Verify Trigger Order

Unexpected behavior sometimes comes from triggers firing in the wrong order. Check `ACTION_ORDER`:

```sql
SELECT TRIGGER_NAME, ACTION_ORDER, ACTION_TIMING, EVENT_MANIPULATION
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'mydb'
  AND EVENT_OBJECT_TABLE = 'orders'
ORDER BY ACTION_ORDER;
```

## Summary

Debug MySQL triggers by writing intermediate values to a log table, reading error messages carefully, examining the trigger body with `SHOW CREATE TRIGGER`, enabling the general query log for full statement traces, and reproducing the trigger logic in a stored procedure for interactive testing.
