# How to Fix Inconsistent Case in MySQL Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Cleaning, String, UPPER, LOWER

Description: Learn how to detect and fix inconsistent character case in MySQL data using UPPER, LOWER, and a custom title-case function for clean, uniform string values.

---

## The Problem with Mixed Case

Inconsistent case in string data - "alice", "ALICE", "Alice" - causes duplicate-looking records, broken lookups, and UI display issues. MySQL comparisons are case-insensitive by default for most collations, but case still matters for display, exports, and external system integrations.

## Detecting Case Inconsistencies

Find rows where the value is not in the expected case. Use `BINARY` to force a case-sensitive comparison, since the default collation is case-insensitive and would treat `'Alice'` and `'alice'` as equal:

```sql
-- Find names not in title case (starting uppercase, rest lower)
SELECT id, name
FROM customers
WHERE BINARY name != CONCAT(UPPER(LEFT(name, 1)), LOWER(SUBSTRING(name, 2)));

-- Find emails not fully lowercase
SELECT id, email
FROM customers
WHERE BINARY email != LOWER(email);

-- Find country codes not fully uppercase
SELECT id, country_code
FROM customers
WHERE BINARY country_code != UPPER(country_code);
```

## Converting to Lowercase

Convert email addresses and identifiers to lowercase:

```sql
UPDATE customers
SET email = LOWER(email)
WHERE BINARY email != LOWER(email);

UPDATE users
SET username = LOWER(username)
WHERE BINARY username != LOWER(username);
```

## Converting to Uppercase

Standardize country codes, currency codes, and other fixed identifiers:

```sql
UPDATE orders
SET currency_code = UPPER(currency_code)
WHERE BINARY currency_code != UPPER(currency_code);

UPDATE addresses
SET country_code = UPPER(country_code)
WHERE BINARY country_code != UPPER(country_code);
```

## Applying Title Case to Names

MySQL lacks a built-in title case function for multi-word strings. For single-word fields:

```sql
UPDATE customers
SET first_name = CONCAT(UPPER(LEFT(first_name, 1)), LOWER(SUBSTRING(first_name, 2)))
WHERE BINARY first_name != CONCAT(UPPER(LEFT(first_name, 1)), LOWER(SUBSTRING(first_name, 2)));
```

For multi-word names, create a stored function:

```sql
DELIMITER $$
CREATE FUNCTION title_case(str VARCHAR(500)) RETURNS VARCHAR(500)
DETERMINISTIC
BEGIN
  DECLARE result VARCHAR(500) DEFAULT '';
  DECLARE word VARCHAR(100);
  DECLARE i INT DEFAULT 1;
  DECLARE len INT;
  SET str = LOWER(str);
  SET len = LENGTH(str) - LENGTH(REPLACE(str, ' ', '')) + 1;
  WHILE i <= len DO
    SET word = SUBSTRING_INDEX(SUBSTRING_INDEX(str, ' ', i), ' ', -1);
    SET result = CONCAT(result, IF(i > 1, ' ', ''),
                        UPPER(LEFT(word, 1)), SUBSTRING(word, 2));
    SET i = i + 1;
  END WHILE;
  RETURN result;
END$$
DELIMITER ;

-- Use it:
UPDATE customers SET name = title_case(name);
```

## Preventing Case Issues on Insert

Use a `BEFORE INSERT` trigger to normalize case as data arrives:

```sql
DELIMITER $$
CREATE TRIGGER normalize_case_before_insert
BEFORE INSERT ON customers
FOR EACH ROW
BEGIN
  SET NEW.email        = LOWER(NEW.email);
  SET NEW.country_code = UPPER(NEW.country_code);
  SET NEW.first_name   = CONCAT(UPPER(LEFT(NEW.first_name, 1)),
                                LOWER(SUBSTRING(NEW.first_name, 2)));
END$$
DELIMITER ;
```

## Choosing Case-Sensitive Collations

If you need case-sensitive queries, use a `_bin` or `_cs` collation on specific columns:

```sql
ALTER TABLE products
  MODIFY COLUMN sku VARCHAR(50)
  CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
```

## Summary

Fix inconsistent case in MySQL using `LOWER()` for emails and identifiers, `UPPER()` for codes, and a title-case stored function for proper names. Apply targeted `UPDATE` statements to existing rows and add `BEFORE INSERT` triggers to normalize future data automatically.
