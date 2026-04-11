# How to Use MySQL for Inventory Management

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Inventory, Transaction, Concurrency, Schema

Description: Learn how to build a MySQL inventory management system with transactional stock adjustments, reservation support, and audit logging to prevent overselling and maintain accuracy.

---

Inventory management in MySQL requires careful concurrency control. Multiple users can attempt to reserve or purchase the same item simultaneously. Without proper locking and transaction design, overselling occurs - selling more units than are physically available.

## Schema Design

Separate current stock levels from stock movement history:

```sql
CREATE TABLE products (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sku         VARCHAR(100) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  UNIQUE KEY uq_sku (sku)
);

CREATE TABLE inventory (
  product_id      BIGINT UNSIGNED NOT NULL PRIMARY KEY,
  quantity_on_hand INT NOT NULL DEFAULT 0,
  quantity_reserved INT NOT NULL DEFAULT 0,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products (id),
  CONSTRAINT chk_qty_non_negative CHECK (quantity_on_hand >= 0),
  CONSTRAINT chk_reserved_non_negative CHECK (quantity_reserved >= 0)
);

CREATE TABLE stock_movements (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id   BIGINT UNSIGNED NOT NULL,
  movement_type ENUM('receive', 'reserve', 'release', 'sell', 'adjust') NOT NULL,
  quantity     INT NOT NULL,
  reference_id VARCHAR(100),
  notes        TEXT,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_product_created (product_id, created_at)
);
```

The `CHECK` constraints prevent negative stock at the database level.

## Reserving Stock (Preventing Overselling)

Use `SELECT ... FOR UPDATE` to lock the inventory row before modifying it:

```sql
DELIMITER $$
CREATE PROCEDURE reserve_stock(
  IN p_product_id BIGINT UNSIGNED,
  IN p_quantity INT,
  IN p_reference_id VARCHAR(100)
)
BEGIN
  DECLARE v_available INT;

  START TRANSACTION;

  SELECT quantity_on_hand - quantity_reserved INTO v_available
  FROM inventory
  WHERE product_id = p_product_id
  FOR UPDATE;

  IF v_available < p_quantity THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient stock';
  END IF;

  UPDATE inventory
  SET quantity_reserved = quantity_reserved + p_quantity
  WHERE product_id = p_product_id;

  INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id)
  VALUES (p_product_id, 'reserve', p_quantity, p_reference_id);

  COMMIT;
END $$
DELIMITER ;
```

## Confirming a Sale

When the order is paid, convert the reservation into a completed sale:

```sql
DELIMITER $$
CREATE PROCEDURE confirm_sale(
  IN p_product_id BIGINT UNSIGNED,
  IN p_quantity INT,
  IN p_order_id VARCHAR(100)
)
BEGIN
  START TRANSACTION;

  UPDATE inventory
  SET
    quantity_on_hand = quantity_on_hand - p_quantity,
    quantity_reserved = quantity_reserved - p_quantity
  WHERE product_id = p_product_id
    AND quantity_reserved >= p_quantity
    AND quantity_on_hand >= p_quantity;

  IF ROW_COUNT() = 0 THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Stock adjustment failed';
  END IF;

  INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id)
  VALUES (p_product_id, 'sell', p_quantity, p_order_id);

  COMMIT;
END $$
DELIMITER ;
```

## Receiving New Stock

```sql
START TRANSACTION;
UPDATE inventory SET quantity_on_hand = quantity_on_hand + 50 WHERE product_id = 1;
INSERT INTO stock_movements (product_id, movement_type, quantity, reference_id)
VALUES (1, 'receive', 50, 'PO-2026-001');
COMMIT;
```

## Querying Available Stock

```sql
SELECT
  p.sku,
  p.name,
  i.quantity_on_hand,
  i.quantity_reserved,
  i.quantity_on_hand - i.quantity_reserved AS available
FROM inventory i
JOIN products p ON p.id = i.product_id
WHERE i.product_id = 1;
```

## Summary

MySQL inventory management prevents overselling by using `SELECT FOR UPDATE` to lock inventory rows before computing available stock, and `CHECK` constraints to enforce non-negative quantities at the database level. The stock movements table provides a complete audit trail. Reservations hold stock during checkout, and confirmed sales convert reservations into permanent deductions - all within ACID transactions.
