# How to Merge Duplicate Records in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Duplicate, Data Cleaning, Merge, Transaction

Description: Learn how to safely merge duplicate records in MySQL by consolidating related data, updating foreign keys, and deleting the surplus rows within a transaction.

---

## What Is Record Merging?

Merging duplicates goes beyond deleting extra rows - it consolidates the data from all duplicates into a single canonical record. Related records in child tables must be re-pointed to the surviving row before the duplicates are removed.

## Identifying Duplicates to Merge

Find customers with duplicate emails, keeping the lowest ID as the canonical record:

```sql
SELECT
  MIN(id) AS keep_id,
  GROUP_CONCAT(id ORDER BY id) AS all_ids,
  email,
  COUNT(*) AS cnt
FROM customers
GROUP BY email
HAVING cnt > 1;
```

## Updating Foreign Keys Before Merging

Before deleting duplicates, update all child table references to point to the canonical record:

```sql
-- For each duplicate pair, update child tables
UPDATE orders
SET customer_id = 1001   -- canonical id
WHERE customer_id = 1099; -- duplicate id

UPDATE reviews
SET customer_id = 1001
WHERE customer_id = 1099;

UPDATE addresses
SET customer_id = 1001
WHERE customer_id = 1099;
```

## Merging Data from Duplicate Rows

Combine values from the duplicate into the canonical record before deleting it:

```sql
-- Keep the earliest created_at and fill in missing phone/address
UPDATE customers c1
JOIN customers c2 ON c2.email = c1.email AND c2.id != c1.id
SET
  c1.created_at = LEAST(c1.created_at, c2.created_at),
  c1.phone      = COALESCE(c1.phone, c2.phone),
  c1.address    = COALESCE(c1.address, c2.address)
WHERE c1.id = (
  SELECT MIN(id) FROM (SELECT * FROM customers) t
  WHERE t.email = c1.email
);
```

## Using a Stored Procedure for Batch Merges

Automate the process for all duplicate groups:

```sql
DELIMITER $$
CREATE PROCEDURE merge_duplicate_customers()
BEGIN
  DECLARE done INT DEFAULT 0;
  DECLARE v_keep_id, v_dup_id BIGINT;

  DECLARE cur CURSOR FOR
    SELECT k.keep_id, c.id AS dup_id
    FROM (
      SELECT MIN(id) AS keep_id, email
      FROM customers
      GROUP BY email
      HAVING COUNT(*) > 1
    ) k
    JOIN customers c ON c.email = k.email AND c.id != k.keep_id;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO v_keep_id, v_dup_id;
    IF done THEN LEAVE read_loop; END IF;

    UPDATE orders SET customer_id = v_keep_id WHERE customer_id = v_dup_id;
    DELETE FROM customers WHERE id = v_dup_id;
  END LOOP;
  CLOSE cur;
END$$
DELIMITER ;
```

## Wrapping the Merge in a Transaction

Always merge inside a transaction so you can roll back if something goes wrong:

```sql
START TRANSACTION;

-- Update foreign keys
UPDATE orders SET customer_id = 1001 WHERE customer_id = 1099;
UPDATE reviews  SET customer_id = 1001 WHERE customer_id = 1099;

-- Merge any useful data
UPDATE customers
SET phone = COALESCE(phone, (SELECT phone FROM (SELECT phone FROM customers WHERE id = 1099) t))
WHERE id = 1001;

-- Delete the duplicate
DELETE FROM customers WHERE id = 1099;

-- Verify
SELECT * FROM customers WHERE id = 1001;

COMMIT;
```

## Summary

Merging duplicates in MySQL requires three steps: identify the canonical record, re-point all foreign key references in child tables, and delete the surplus rows. Combine the best data from all duplicates before deletion, and always wrap the operation in a transaction. Add a unique index afterward to prevent the duplicates from re-forming.
