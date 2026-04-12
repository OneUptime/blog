# How to Configure Transaction Size Limits in MySQL Group Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Group Replication, Transaction, Configuration, Replication

Description: Configure MySQL Group Replication transaction size limits to prevent large transactions from causing certification failures or network congestion.

---

## Why Transaction Size Matters

MySQL Group Replication broadcasts every transaction to all group members before committing. A single large transaction that modifies millions of rows can:

- Saturate the network between nodes
- Cause the certification database to grow excessively
- Trigger flow control, slowing all writes
- Exceed the XCom message size limit and cause the transaction to be rejected

## View the Current Transaction Size Limit

```sql
SHOW VARIABLES LIKE 'group_replication_transaction_size_limit';
```

```text
+------------------------------------------+-----------+
| Variable_name                            | Value     |
+------------------------------------------+-----------+
| group_replication_transaction_size_limit | 150000000 |
+------------------------------------------+-----------+
```

The default is approximately 143 MB (150,000,000 bytes). Transactions exceeding this size are rolled back with an error.

## Change the Transaction Size Limit

```sql
-- Set to 50 MB to enforce smaller transactions
SET GLOBAL group_replication_transaction_size_limit = 52428800;
```

To persist across restarts, add to `my.cnf`:

```ini
[mysqld]
group_replication_transaction_size_limit = 52428800
```

Setting to `0` disables the limit entirely, which is not recommended.

## What Happens When the Limit Is Exceeded

If a transaction exceeds the limit, it is rejected before being broadcast to the group and rolled back:

```text
ERROR 3100 (HY000): Error on observer while running replication hook 'before_commit'.
```

The error appears in the application and in the MySQL error log:

```bash
# Check error log
grep "transaction_size_limit" /var/log/mysql/error.log
```

## Identify Large Transactions

Before setting a limit, identify existing large transactions:

```sql
-- Check binary log for large transactions (run from shell)
-- mysqlbinlog --verbose mysql-bin.000001 | grep "# at" | awk '{print $3}' | sort -n | tail -20
```

Or query active transactions in the Information Schema:

```sql
SELECT
  trx_id,
  trx_rows_modified,
  trx_rows_locked,
  trx_query
FROM information_schema.innodb_trx
ORDER BY trx_rows_modified DESC
LIMIT 10;
```

## Break Up Large Batch Operations

Instead of one large `UPDATE`, use batched updates:

```sql
-- Instead of this:
UPDATE orders SET status = 'archived' WHERE created_at < '2023-01-01';

-- Do this in a stored procedure:
DELIMITER //
CREATE PROCEDURE batch_archive()
BEGIN
  DECLARE affected INT DEFAULT 1;
  REPEAT
    UPDATE orders SET status = 'archived'
    WHERE created_at < '2023-01-01'
      AND status != 'archived'
    LIMIT 1000;
    SET affected = ROW_COUNT();
    DO SLEEP(0.01);
  UNTIL affected = 0
  END REPEAT;
END //
DELIMITER ;

CALL batch_archive();
```

In application code (Python example):

```python
import mysql.connector

conn = mysql.connector.connect(host='node1', user='app', password='secret', database='mydb')
cursor = conn.cursor()

while True:
    cursor.execute(
        "UPDATE orders SET status = 'archived' "
        "WHERE created_at < '2023-01-01' AND status != 'archived' LIMIT 1000"
    )
    conn.commit()
    if cursor.rowcount == 0:
        break
```

## Configure Limits for Large Load Operations

If you need to load large data sets, temporarily increase the limit, run the import, then restore it:

```sql
SET GLOBAL group_replication_transaction_size_limit = 1073741824; -- 1 GB

-- Run your large import
LOAD DATA INFILE '/path/to/data.csv' INTO TABLE large_table ...;

-- Restore the limit
SET GLOBAL group_replication_transaction_size_limit = 150000000;
```

## Summary

Configure `group_replication_transaction_size_limit` to prevent large transactions from saturating the group replication network and causing certification failures. The default is approximately 143 MB (150,000,000 bytes). Break large batch operations into smaller chunks of 1000-10000 rows each, with a small sleep between batches to avoid triggering flow control. Monitor transaction sizes using `information_schema.innodb_trx` before setting the limit.
