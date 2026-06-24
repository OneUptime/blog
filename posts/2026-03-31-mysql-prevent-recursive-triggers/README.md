# How to Prevent Recursive Triggers in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, Recursive, innodb_recursive_triggers, Configuration

Description: Learn why MySQL triggers can become recursive, how the innodb_recursive_triggers variable controls this, and how to write triggers that avoid infinite loops.

---

A recursive trigger situation occurs when a trigger fires, and the SQL inside the trigger body modifies the same table that the trigger is attached to (or a table whose trigger modifies the original table), causing a circular dependency. In MySQL, this does not result in an infinite loop - the storage engine detects the conflict and raises `ERROR 1442 (HY000): Can't update table in stored function/trigger body because it is already used by statement which invoked this stored function/trigger`.

## How MySQL Handles Trigger Recursion

MySQL prevents a trigger from modifying any table that is already being read or written by the statement that invoked the trigger. This restriction is documented in the [stored program restrictions](https://dev.mysql.com/doc/refman/8.0/en/stored-program-restrictions.html) and applies to all storage engines:

```sql
-- There is no system variable to enable or disable trigger recursion.
-- MySQL unconditionally blocks it with ERROR 1442.
```

This means:

- A trigger on table A **cannot** issue an `UPDATE`, `INSERT`, or `DELETE` against table A.
- A trigger on table A that modifies table B, where table B has a trigger that modifies table A, will also fail with ERROR 1442 because table A is still in use by the original statement.

## Direct Recursion Example

```sql
DELIMITER //

-- This trigger tries to update the same table - MySQL will block it
CREATE TRIGGER trg_employees_after_update
AFTER UPDATE ON employees
FOR EACH ROW
BEGIN
    -- This UPDATE on employees raises ERROR 1442
    UPDATE employees SET last_modified = NOW() WHERE emp_id = NEW.emp_id;
END //

DELIMITER ;
```

When you run an `UPDATE` on the `employees` table, MySQL raises:

```text
ERROR 1442 (HY000): Can't update table 'employees' in stored function/trigger body because it is already used by statement which invoked this stored function/trigger.
```

The correct approach is to use a `BEFORE UPDATE` trigger and set the column directly on the `NEW` row, which does not require a separate `UPDATE` statement.

## Indirect Recursion - The Real Risk

```sql
-- Trigger on table_a updates table_b
CREATE TRIGGER trg_a_after_update
AFTER UPDATE ON table_a
FOR EACH ROW
BEGIN
    UPDATE table_b SET synced_val = NEW.value WHERE id = NEW.id;
END;

-- Trigger on table_b updates table_a - ERROR 1442
CREATE TRIGGER trg_b_after_update
AFTER UPDATE ON table_b
FOR EACH ROW
BEGIN
    UPDATE table_a SET mirrored_val = NEW.synced_val WHERE id = NEW.id;
END;
```

When an `UPDATE` hits `table_a`, the trigger on `table_a` successfully updates `table_b`. But when `table_b`'s trigger tries to update `table_a`, MySQL blocks it because `table_a` is still in use by the original statement:

```text
ERROR 1442 (HY000): Can't update table 'table_a' in stored function/trigger body because it is already used by statement which invoked this stored function/trigger.
```

## Prevention Strategy 1 - Use a BEFORE Trigger with SET NEW

When you need to update a column on the same table, avoid a separate `UPDATE` statement. Use a `BEFORE` trigger and assign directly to the `NEW` row:

```sql
DELIMITER //

CREATE TRIGGER trg_employees_before_update
BEFORE UPDATE ON employees
FOR EACH ROW
BEGIN
    SET NEW.last_modified = NOW();
END //

DELIMITER ;
```

The `SET NEW.column` syntax modifies the row being written without issuing a new `UPDATE`, so ERROR 1442 is never raised. This is the standard workaround for direct recursion scenarios.

## Prevention Strategy 2 - Break the Cycle with Application Logic

For indirect recursion (table A ↔ table B), you cannot solve ERROR 1442 inside triggers alone because the restriction is enforced before any trigger body logic runs. Instead, keep the trigger in one direction and handle the reverse synchronization in your application code:

```sql
DELIMITER //

-- Only keep the trigger in one direction
CREATE TRIGGER trg_a_after_update
AFTER UPDATE ON table_a
FOR EACH ROW
BEGIN
    UPDATE table_b SET synced_val = NEW.value WHERE id = NEW.id;
END //

DELIMITER ;

-- Remove the trigger on table_b that writes back to table_a.
-- Handle the reverse sync in your application code or a stored procedure instead.
```

Alternatively, use a stored procedure that performs both updates in the correct order without relying on trigger chains.

## Summary

MySQL unconditionally prevents trigger recursion - both direct and indirect - by raising ERROR 1442 whenever a trigger attempts to modify a table already in use by the invoking statement. For direct cases, use `BEFORE` triggers with `SET NEW.col = value` to modify the current row without a separate `UPDATE`. For indirect cases, break the circular dependency by removing one trigger from the chain and handling that synchronization in application code or a stored procedure.
