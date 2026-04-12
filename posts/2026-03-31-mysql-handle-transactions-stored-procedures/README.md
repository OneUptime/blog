# How to Handle Transactions in MySQL Stored Procedures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Stored Procedure, Transaction, Error Handling, InnoDB

Description: Learn how to use START TRANSACTION, COMMIT, and ROLLBACK inside MySQL stored procedures to ensure data consistency on errors.

---

Transactions inside stored procedures let you group multiple DML statements into an atomic unit of work. If any statement fails, you can roll back every change made in that session, keeping your data consistent.

## Why Transactions Matter in Stored Procedures

A stored procedure often performs several related writes - for example, inserting an order and decrementing inventory. Without a transaction, a crash between those two statements leaves the database in a partially updated state. Wrapping them in a transaction means either both succeed or neither does.

MySQL uses `START TRANSACTION` to open a transaction, `COMMIT` to persist changes, and `ROLLBACK` to undo them. Outside of stored programs `BEGIN` works as an alias for `START TRANSACTION`, but inside stored procedures the parser treats `BEGIN` as the start of a `BEGIN ... END` block, so you must use `START TRANSACTION`.

## Basic Transaction Structure

```sql
DELIMITER //

CREATE PROCEDURE place_order(
    IN p_user_id   INT,
    IN p_product_id INT,
    IN p_quantity   INT
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO orders (user_id, product_id, quantity, created_at)
    VALUES (p_user_id, p_product_id, p_quantity, NOW());

    UPDATE inventory
    SET stock = stock - p_quantity
    WHERE product_id = p_product_id;

    COMMIT;
END //

DELIMITER ;
```

The `DECLARE EXIT HANDLER FOR SQLEXCEPTION` block catches any SQL error. When triggered it rolls back the open transaction and re-raises the error with `RESIGNAL` so the caller knows something went wrong.

## Using a Status Variable Instead of RESIGNAL

If you prefer to return a status code rather than propagate the exception, use an INOUT or OUT parameter:

```sql
DELIMITER //

CREATE PROCEDURE transfer_funds(
    IN  p_from_account INT,
    IN  p_to_account   INT,
    IN  p_amount       DECIMAL(10,2),
    OUT p_status       VARCHAR(50)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status = 'ERROR';
    END;

    START TRANSACTION;

    UPDATE accounts
    SET balance = balance - p_amount
    WHERE account_id = p_from_account;

    UPDATE accounts
    SET balance = balance + p_amount
    WHERE account_id = p_to_account;

    COMMIT;
    SET p_status = 'OK';
END //

DELIMITER ;
```

Call it and inspect the status:

```sql
CALL transfer_funds(1, 2, 250.00, @status);
SELECT @status;
```

## Savepoints for Partial Rollbacks

When you want to undo only part of a transaction, use `SAVEPOINT`:

```sql
DELIMITER //

CREATE PROCEDURE process_batch()
BEGIN
    DECLARE CONTINUE HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK TO sp_item;
    END;

    START TRANSACTION;

    INSERT INTO batch_log (message) VALUES ('batch started');

    SAVEPOINT sp_item;

    -- This may fail; the handler rolls back to the savepoint
    INSERT INTO risky_table (data) VALUES ('test');

    COMMIT;
END //

DELIMITER ;
```

## Key Points

- Always declare the handler **before** `START TRANSACTION` so MySQL registers it in time.
- `EXIT HANDLER` stops procedure execution after the handler body runs; `CONTINUE HANDLER` lets execution proceed.
- `AUTOCOMMIT` does not affect explicit transactions - `START TRANSACTION` always opens a new transaction regardless of the `autocommit` setting.
- InnoDB is the only MySQL storage engine that supports transactions; MyISAM statements inside a transaction are committed immediately and cannot be rolled back.

## Summary

Handling transactions inside MySQL stored procedures requires combining `START TRANSACTION`, `COMMIT`, and `ROLLBACK` with a `DECLARE ... HANDLER FOR SQLEXCEPTION` block. This pattern guarantees atomicity across multiple writes and gives you clean error propagation back to the application layer.
