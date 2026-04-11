# How to Set Trigger Order with FOLLOWS and PRECEDES in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Trigger, FOLLOWS, PRECEDES, Execution Order

Description: Learn how to control the execution order of multiple MySQL triggers on the same table event using the FOLLOWS and PRECEDES clauses.

---

When multiple triggers of the same type exist on a table, MySQL executes them in the order they were created unless you specify otherwise. The `FOLLOWS` and `PRECEDES` clauses let you declare an explicit ordering relationship between triggers, making execution order predictable and independent of creation time.

## Why Order Matters

Consider two `BEFORE INSERT` triggers on a `users` table:
1. `trg_users_normalize` - lowercases the email
2. `trg_users_validate` - checks the email format

If `validate` runs before `normalize`, it sees the original mixed-case email. If it runs after, it sees the normalized lowercase version. The order determines which behavior you get.

## FOLLOWS - Run After Another Trigger

`FOLLOWS existing_trigger` means the new trigger fires after the named trigger:

```sql
DELIMITER //

CREATE TRIGGER trg_users_normalize
BEFORE INSERT ON users
FOR EACH ROW
BEGIN
    SET NEW.email = LOWER(NEW.email);
END //

-- This trigger runs AFTER trg_users_normalize
CREATE TRIGGER trg_users_validate
BEFORE INSERT ON users
FOR EACH ROW
FOLLOWS trg_users_normalize
BEGIN
    IF NEW.email NOT REGEXP '^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid email address format';
    END IF;
END //

DELIMITER ;
```

Now `trg_users_validate` sees the already-normalized lowercase email.

## PRECEDES - Run Before Another Trigger

`PRECEDES existing_trigger` means the new trigger fires before the named trigger:

```sql
DELIMITER //

-- Audit trigger already exists; add a pre-processing trigger before it
CREATE TRIGGER trg_orders_enrich
BEFORE INSERT ON orders
FOR EACH ROW
PRECEDES trg_orders_audit
BEGIN
    -- Enrich data before audit logging
    SET NEW.region = get_region(NEW.user_id);
END //

DELIMITER ;
```

## Verifying the Execution Order

After creating your triggers, confirm the order using `information_schema`:

```sql
SELECT
    TRIGGER_NAME,
    ACTION_TIMING,
    EVENT_MANIPULATION,
    ACTION_ORDER
FROM information_schema.TRIGGERS
WHERE TRIGGER_SCHEMA = 'mydb'
  AND EVENT_OBJECT_TABLE = 'users'
ORDER BY ACTION_TIMING, EVENT_MANIPULATION, ACTION_ORDER;
```

The `ACTION_ORDER` column reflects the actual execution sequence (1 = first).

## Changing Order on Existing Triggers

You cannot alter the order of an existing trigger with `ALTER TRIGGER`. To change the order, drop and recreate the trigger with the new `FOLLOWS` or `PRECEDES` clause:

```sql
DROP TRIGGER IF EXISTS trg_users_validate;

DELIMITER //

CREATE TRIGGER trg_users_validate
BEFORE INSERT ON users
FOR EACH ROW
FOLLOWS trg_users_normalize
BEGIN
    IF NEW.email NOT REGEXP '^[a-z0-9._%+\\-]+@[a-z0-9.\\-]+\\.[a-z]{2,}$' THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Invalid email address format';
    END IF;
END //

DELIMITER ;
```

## Constraints

- `FOLLOWS` and `PRECEDES` only work for triggers of the same type (same timing and same event) on the same table.
- The referenced trigger must already exist when you run `CREATE TRIGGER`.
- Chaining more than two or three triggers becomes hard to maintain; consider consolidating logic into a single trigger when the chain grows.

## Summary

Use `FOLLOWS` to run a new trigger after an existing one, and `PRECEDES` to run it before. Always verify the resulting `ACTION_ORDER` in `information_schema.TRIGGERS` after creation. Explicit ordering removes dependence on creation sequence and makes trigger behavior reproducible across environments.
