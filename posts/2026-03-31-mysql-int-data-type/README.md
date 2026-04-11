# How to Use INT Data Type in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Data Type, Integer, Table, Storage

Description: Learn how to use the INT data type in MySQL, including storage size, signed vs unsigned ranges, and practical table design examples.

---

The `INT` data type is one of the most commonly used numeric types in MySQL. It stores whole numbers and is ideal for counters, identifiers, quantities, and any column where fractional values are not needed.

## INT Storage and Range

MySQL's `INT` (also written as `INTEGER`) uses 4 bytes of storage. The signed range covers -2,147,483,648 to 2,147,483,647. The unsigned range extends from 0 to 4,294,967,295.

```sql
CREATE TABLE products (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    quantity INT NOT NULL DEFAULT 0,
    reorder_level INT DEFAULT 10
);
```

The `UNSIGNED` modifier doubles the positive range and is useful for columns that will never hold negative values, such as primary keys and quantities.

## Choosing INT vs Other Integer Types

MySQL offers several integer types. Use the smallest type that safely holds your expected values to conserve storage and improve cache efficiency.

```sql
-- TINYINT  : 1 byte, signed -128 to 127
-- SMALLINT : 2 bytes, signed -32768 to 32767
-- MEDIUMINT: 3 bytes, signed -8388608 to 8388607
-- INT      : 4 bytes, signed -2147483648 to 2147483647
-- BIGINT   : 8 bytes, signed -9223372036854775808 to 9223372036854775807

CREATE TABLE order_items (
    item_id    INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    order_id   INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    quantity   SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    discount   TINYINT UNSIGNED DEFAULT 0
);
```

## INT with AUTO_INCREMENT

`INT` is the default choice for surrogate primary keys with `AUTO_INCREMENT`. When the table could grow beyond ~2 billion rows, prefer `BIGINT UNSIGNED`.

```sql
CREATE TABLE events (
    event_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
    event_name VARCHAR(100) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (event_id)
) ENGINE=InnoDB;

-- Insert and retrieve the generated key
INSERT INTO events (event_name) VALUES ('user_signup');
SELECT LAST_INSERT_ID();
```

## Display Width (Deprecated)

Older MySQL code often uses `INT(11)`. The number in parentheses was a display width hint used with `ZEROFILL` and has no effect on storage or range. It was deprecated in MySQL 8.0.17 and should be avoided in new schemas.

```sql
-- Avoid this in new code (deprecated display width)
id INT(11) NOT NULL AUTO_INCREMENT

-- Use this instead
id INT NOT NULL AUTO_INCREMENT
```

## Inserting and Querying INT Columns

```sql
INSERT INTO products (quantity, reorder_level) VALUES (100, 20);
INSERT INTO products (quantity, reorder_level) VALUES (0, 5);

-- Range filter on INT column benefits from an index
SELECT id, quantity FROM products WHERE quantity > 50;

-- Arithmetic directly in queries
UPDATE products SET quantity = quantity - 1 WHERE id = 1;
```

## Constraints and Defaults

```sql
ALTER TABLE products
    ADD COLUMN stock_reserved INT NOT NULL DEFAULT 0,
    ADD COLUMN max_stock      INT UNSIGNED NOT NULL DEFAULT 1000;

-- CHECK constraint to prevent negative stock
ALTER TABLE products
    ADD CONSTRAINT chk_quantity CHECK (quantity >= 0);
```

## Performance Considerations

INT columns that appear in `WHERE`, `JOIN`, or `ORDER BY` clauses should be indexed. Comparing an INT column to a string literal causes MySQL to silently convert the string to a number, which can produce unexpected matches when the string contains non-numeric characters.

```sql
-- Good: compare INT to INT
SELECT * FROM products WHERE id = 42;

-- Bad: '42abc' is silently converted to 42, producing unexpected results
SELECT * FROM products WHERE id = '42abc';
```

## Summary

The `INT` data type provides a 4-byte signed or unsigned integer suitable for most counters, foreign keys, and surrogate primary keys. Use `UNSIGNED` when negative values are impossible, avoid deprecated display width syntax, and choose a smaller type like `SMALLINT` or `TINYINT` when the value range permits to reduce storage overhead.
