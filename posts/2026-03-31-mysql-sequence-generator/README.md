# How to Implement a Sequence Generator in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Pattern, Sequence, Concurrency, Schema

Description: Learn how to implement reliable sequence generators in MySQL for custom IDs, invoice numbers, and ordered unique values without gaps.

---

## Why Custom Sequences?

MySQL's `AUTO_INCREMENT` generates unique IDs but does not guarantee sequential values without gaps (transactions that rollback leave gaps). For use cases like invoice numbers, order numbers, or ticket IDs where sequential gapless values or custom formats are required, you need a dedicated sequence generator.

## Simple Sequence Table

```sql
CREATE TABLE sequences (
    name VARCHAR(100) PRIMARY KEY,
    current_value BIGINT NOT NULL DEFAULT 0,
    step INT NOT NULL DEFAULT 1
);

-- Initialize sequences
INSERT INTO sequences (name, current_value, step) VALUES
    ('invoice_number', 1000, 1),
    ('order_number', 0, 1),
    ('ticket_id', 5000, 10);
```

## Generating the Next Value

Use a two-step update-and-select to atomically fetch the next value:

```sql
DELIMITER $$

CREATE FUNCTION next_sequence(p_name VARCHAR(100))
RETURNS BIGINT
MODIFIES SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_value BIGINT;

    UPDATE sequences
    SET current_value = current_value + step
    WHERE name = p_name;

    SELECT current_value INTO v_value
    FROM sequences
    WHERE name = p_name;

    RETURN v_value;
END$$

DELIMITER ;

-- Get next invoice number
SELECT next_sequence('invoice_number');  -- Returns 1001
SELECT next_sequence('invoice_number');  -- Returns 1002
```

## Formatted Sequence Values

Combine the numeric sequence with a prefix for human-readable IDs:

```sql
DELIMITER $$

CREATE FUNCTION next_invoice_number()
RETURNS VARCHAR(20)
MODIFIES SQL DATA
DETERMINISTIC
BEGIN
    DECLARE v_num BIGINT;
    DECLARE v_year CHAR(4);

    UPDATE sequences
    SET current_value = current_value + step
    WHERE name = 'invoice_number';

    SELECT current_value INTO v_num
    FROM sequences
    WHERE name = 'invoice_number';

    SET v_year = YEAR(CURDATE());

    -- Format: INV-2026-001234
    RETURN CONCAT('INV-', v_year, '-', LPAD(v_num, 6, '0'));
END$$

DELIMITER ;

SELECT next_invoice_number();  -- Returns 'INV-2026-001001'
```

## Using Sequences in INSERT

```sql
-- Use the sequence function directly in an INSERT
INSERT INTO invoices (invoice_number, customer_id, total, created_at)
VALUES (next_invoice_number(), 42, 299.99, NOW());
```

## Per-Entity Sequences

Sometimes you need per-entity sequences (e.g., sequential order numbers per customer):

```sql
CREATE TABLE entity_sequences (
    entity_type VARCHAR(50) NOT NULL,
    entity_id INT NOT NULL,
    current_value BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (entity_type, entity_id)
);

DELIMITER $$

CREATE FUNCTION next_entity_sequence(
    p_entity_type VARCHAR(50),
    p_entity_id INT
)
RETURNS BIGINT
MODIFIES SQL DATA
DETERMINISTIC
BEGIN
    INSERT INTO entity_sequences (entity_type, entity_id, current_value)
    VALUES (p_entity_type, p_entity_id, 1)
    ON DUPLICATE KEY UPDATE current_value = current_value + 1;

    RETURN (
        SELECT current_value FROM entity_sequences
        WHERE entity_type = p_entity_type
          AND entity_id = p_entity_id
    );
END$$

DELIMITER ;

-- Customer 42's 1st order gets sequence 1, their 2nd order gets 2
SELECT next_entity_sequence('customer_orders', 42);  -- Returns 1
SELECT next_entity_sequence('customer_orders', 42);  -- Returns 2
SELECT next_entity_sequence('customer_orders', 99);  -- Returns 1
```

## Concurrency Safety

The `UPDATE` statement acquires a row lock on the sequence row, ensuring concurrent calls get unique values. The lock is released when the transaction commits, so sequence generation is safe under high concurrency.

```sql
-- Test concurrent safety by checking for gaps
SELECT
    invoice_number,
    LAG(CAST(SUBSTRING(invoice_number, 10) AS UNSIGNED))
        OVER (ORDER BY id) AS prev_num,
    CAST(SUBSTRING(invoice_number, 10) AS UNSIGNED) -
        LAG(CAST(SUBSTRING(invoice_number, 10) AS UNSIGNED))
        OVER (ORDER BY id) AS gap
FROM invoices
ORDER BY id;
```

## Summary

A MySQL sequence generator table provides gapless, ordered, custom-formatted unique values that `AUTO_INCREMENT` cannot guarantee. The `UPDATE` + `SELECT` pattern within a stored function atomically claims the next value with row-level locking. Per-entity sequences enable hierarchical numbering schemes, while formatted functions produce human-readable IDs like invoice or order numbers directly from MySQL without application-level formatting.
