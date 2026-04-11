# How to Handle MySQL Error Handling Best Practices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Error, Best Practice, Transaction, Exception

Description: Learn MySQL error handling best practices for stored procedures, application code, and deadlock recovery to write robust database interactions that fail gracefully.

---

MySQL errors fall into several categories: constraint violations, deadlocks, connection failures, and data truncation. Handling each category correctly prevents data corruption, surfaces meaningful messages to users, and keeps applications running under adverse conditions.

## Understand MySQL Error Codes

MySQL errors have a numeric error code, a five-character SQLSTATE, and a message. Common codes to handle explicitly:

```text
1062  (23000) - Duplicate entry for unique constraint
1213  (40001) - Deadlock found; transaction rolled back
1205  (HY000) - Lock wait timeout exceeded
1406  (22001) - Data too long for column
1364  (HY000) - Field has no default value
2006  (HY000) - MySQL server has gone away
```

## Error Handling in Stored Procedures

Use `DECLARE ... HANDLER` to trap specific conditions:

```sql
DELIMITER $$

CREATE PROCEDURE upsert_customer(
  IN p_email VARCHAR(200),
  IN p_name  VARCHAR(200)
)
BEGIN
  DECLARE duplicate_key CONDITION FOR SQLSTATE '23000';
  DECLARE EXIT HANDLER FOR duplicate_key
  BEGIN
    UPDATE customers SET name = p_name WHERE email = p_email;
  END;

  INSERT INTO customers (email, name) VALUES (p_email, p_name);
END $$

DELIMITER ;
```

The `EXIT HANDLER` executes the handler body when the condition is raised, then exits the enclosing `BEGIN...END` block. It does not perform an automatic rollback — add an explicit `ROLLBACK` in the handler body if needed.

## Deadlock Handling in Application Code

Deadlocks are normal in concurrent workloads. Always retry the transaction:

```python
import pymysql
import time

def run_with_deadlock_retry(connection_factory, fn, max_retries=3):
    for attempt in range(max_retries):
        conn = connection_factory()
        try:
            conn.begin()
            result = fn(conn)
            conn.commit()
            return result
        except pymysql.err.OperationalError as e:
            conn.rollback()
            if e.args[0] == 1213 and attempt < max_retries - 1:
                time.sleep(0.1 * (2 ** attempt))
                continue
            raise
        finally:
            conn.close()
```

Error code `1213` is the deadlock error. The exponential backoff reduces contention by spacing out retries.

## Constraint Violation Handling

Distinguish between different constraint violations by inspecting the error message:

```python
import pymysql

def create_user(conn, email, username):
    try:
        with conn.cursor() as cursor:
            cursor.execute(
                "INSERT INTO users (email, username) VALUES (%s, %s)",
                (email, username)
            )
    except pymysql.err.IntegrityError as e:
        code, msg = e.args
        if code == 1062:
            if 'email' in msg:
                raise ValueError("Email address is already registered")
            elif 'username' in msg:
                raise ValueError("Username is already taken")
        raise
```

## Logging Errors with Context

Always log the full error context including the query parameters:

```python
import logging

logger = logging.getLogger(__name__)

def safe_insert(conn, table, data):
    sql = f"INSERT INTO {table} SET " + ", ".join(f"{k} = %s" for k in data)
    try:
        with conn.cursor() as cursor:
            cursor.execute(sql, list(data.values()))
    except Exception as e:
        logger.error(
            "DB insert failed",
            extra={"table": table, "data": data, "error": str(e)}
        )
        raise
```

## Using SIGNAL in Stored Procedures

Raise application-level errors from stored procedures with meaningful messages:

```sql
DELIMITER $$

CREATE PROCEDURE transfer_funds(
  IN from_account INT,
  IN to_account INT,
  IN amount DECIMAL(10,2)
)
BEGIN
  DECLARE balance DECIMAL(10,2);
  SELECT balance_amount INTO balance FROM accounts WHERE id = from_account FOR UPDATE;
  IF balance < amount THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient funds';
  END IF;
  UPDATE accounts SET balance_amount = balance_amount - amount WHERE id = from_account;
  UPDATE accounts SET balance_amount = balance_amount + amount WHERE id = to_account;
END $$

DELIMITER ;
```

## Summary

MySQL error handling requires mapping error codes to recovery strategies: retry deadlocks with backoff, handle constraint violations by inspecting which constraint was violated, log full context for unexpected errors, and use `SIGNAL` to raise business rule violations from stored procedures. Treating each error category with a specific strategy produces resilient applications that degrade gracefully rather than crashing under concurrent load.
