# How to Implement MySQL Retry Logic in Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Retry, Resilience, Deadlock, Best Practice

Description: Learn how to implement retry logic for MySQL operations in application code to handle deadlocks, lock timeouts, and transient connection failures reliably.

---

MySQL operations can fail transiently due to deadlocks, lock wait timeouts, and network interruptions. Rather than letting these errors propagate as unhandled exceptions, applications should retry the operation with a backoff strategy. The key is knowing which errors are safe to retry and which indicate a permanent failure.

## Errors That Are Safe to Retry

Not all MySQL errors should trigger a retry. Retryable errors are those caused by concurrency or transient connectivity:

```text
1213 (ER_LOCK_DEADLOCK)       - Deadlock; MySQL rolled back the transaction
1205 (ER_LOCK_WAIT_TIMEOUT)   - Lock wait exceeded; last statement rolled back
2006 (CR_SERVER_GONE_ERROR)   - Connection lost during query
2013 (CR_SERVER_LOST)         - Lost connection to MySQL server during query
```

Non-retryable errors include constraint violations (1062), syntax errors (1064), and access denied (1045).

## A Generic Retry Decorator in Python

```python
import time
import functools
import pymysql

RETRYABLE_MYSQL_ERRORS = {1213, 1205, 2006, 2013}

def mysql_retry(max_attempts=3, base_delay=0.1, backoff=2.0):
    def decorator(fn):
        @functools.wraps(fn)
        def wrapper(*args, **kwargs):
            delay = base_delay
            for attempt in range(1, max_attempts + 1):
                try:
                    return fn(*args, **kwargs)
                except pymysql.err.OperationalError as e:
                    code = e.args[0]
                    if code in RETRYABLE_MYSQL_ERRORS and attempt < max_attempts:
                        time.sleep(delay)
                        delay *= backoff
                        continue
                    raise
        return wrapper
    return decorator
```

Apply the decorator to any database function:

```python
@mysql_retry(max_attempts=3, base_delay=0.1)
def transfer_funds(conn, from_id, to_id, amount):
    with conn.cursor() as cur:
        cur.execute("START TRANSACTION")
        cur.execute(
            "UPDATE accounts SET balance = balance - %s WHERE id = %s",
            (amount, from_id)
        )
        cur.execute(
            "UPDATE accounts SET balance = balance + %s WHERE id = %s",
            (amount, to_id)
        )
        conn.commit()
```

## Retry Logic in Node.js

```javascript
const RETRYABLE_CODES = new Set([1213, 1205]);

async function withRetry(fn, maxAttempts = 3, baseDelayMs = 100) {
  let delay = baseDelayMs;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const code = err.errno || err.code;
      if (RETRYABLE_CODES.has(code) && attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
      throw err;
    }
  }
}

// Usage
await withRetry(() => pool.execute(
  "UPDATE inventory SET quantity = quantity - ? WHERE product_id = ?",
  [1, productId]
));
```

## Always Rollback Before Retrying

A retried transaction must start fresh. Ensure the previous transaction is rolled back before the next attempt:

```python
def run_transaction_with_retry(conn, fn, max_attempts=3):
    delay = 0.1
    for attempt in range(1, max_attempts + 1):
        try:
            conn.begin()
            result = fn(conn)
            conn.commit()
            return result
        except pymysql.err.OperationalError as e:
            conn.rollback()
            if e.args[0] in RETRYABLE_MYSQL_ERRORS and attempt < max_attempts:
                time.sleep(delay)
                delay *= 2
                continue
            raise
        except Exception:
            conn.rollback()
            raise
```

## Logging Retry Attempts

Log each retry attempt so you can monitor deadlock frequency in production:

```python
import logging
logger = logging.getLogger(__name__)

# Inside the retry loop
logger.warning(
    "Retryable MySQL error, attempt %d/%d",
    attempt, max_attempts,
    extra={"error_code": code, "delay_ms": delay * 1000}
)
```

## Summary

MySQL retry logic requires identifying retryable error codes, rolling back before each retry, applying exponential backoff to reduce contention, and logging each attempt for observability. Implementing this as a reusable decorator or wrapper function ensures consistent behavior across all database operations without duplicating error handling code throughout the codebase.
