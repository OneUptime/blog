# How to Implement the Saga Pattern with MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Saga Pattern, Microservice, Distributed Transaction

Description: Learn how to implement the Saga pattern with MySQL using local transactions, outbox events, and compensating transactions to manage distributed workflows reliably.

---

## What Is the Saga Pattern

The Saga pattern manages distributed transactions across multiple services by breaking them into a sequence of local database transactions. Each step publishes an event when it succeeds. If any step fails, compensating transactions undo the previously completed steps in reverse order.

MySQL supports the Saga pattern well through InnoDB's ACID local transactions, the transactional outbox pattern, and event-driven choreography.

## Order Placement Saga Example

Saga steps for placing an order:

```text
1. Order Service    - create order (PENDING)
2. Inventory Service - reserve stock
3. Payment Service  - charge customer
4. Order Service    - confirm order (CONFIRMED)

Compensations (on failure):
- Payment failure    -> release inventory reservation, cancel order
- Inventory failure  -> cancel order
```

## Step 1 - Order Service: Create Order

```sql
USE order_svc;

START TRANSACTION;
  INSERT INTO orders (id, user_id, total, status)
  VALUES (NULL, 42, 149.99, 'PENDING');

  SET @order_id = LAST_INSERT_ID();

  INSERT INTO outbox_events (event_type, aggregate_id, payload)
  VALUES ('ORDER_CREATED', @order_id, JSON_OBJECT(
    'order_id', @order_id,
    'user_id',  42,
    'total',    149.99,
    'sku',      'SKU-001',
    'quantity', 2
  ));
COMMIT;
```

## Step 2 - Inventory Service: Reserve Stock

```sql
USE inventory_svc;

-- Triggered by ORDER_CREATED event
-- The application checks ROW_COUNT() after the UPDATE
-- and runs one of the two paths below.

-- Path A: attempt reservation
START TRANSACTION;
  UPDATE products
  SET reserved = reserved + 2,
      available = available - 2
  WHERE sku = 'SKU-001'
    AND available >= 2;
  -- Application checks ROW_COUNT() here
COMMIT;
```

If `ROW_COUNT()` returns 0 (not enough stock), the application runs the failure path:

```sql
START TRANSACTION;
  INSERT INTO outbox_events (event_type, aggregate_id, payload)
  VALUES ('INVENTORY_RESERVATION_FAILED',
    'SKU-001',
    JSON_OBJECT('order_id', 101, 'reason', 'insufficient_stock'));
COMMIT;
```

If `ROW_COUNT()` returns 1 or more (stock reserved), the application publishes the success event:

```sql
START TRANSACTION;
  INSERT INTO outbox_events (event_type, aggregate_id, payload)
  VALUES ('INVENTORY_RESERVED', 'SKU-001',
    JSON_OBJECT('order_id', 101, 'sku', 'SKU-001', 'quantity', 2));
COMMIT;
```

## Step 3 - Payment Service: Charge Customer

```sql
USE payment_svc;

-- Triggered by INVENTORY_RESERVED event
START TRANSACTION;
  INSERT INTO payments (order_id, amount, status)
  VALUES (101, 149.99, 'PROCESSING');

  -- Simulate external payment gateway call result
  -- On success:
  UPDATE payments SET status = 'COMPLETED' WHERE order_id = 101;
  INSERT INTO outbox_events (event_type, aggregate_id, payload)
  VALUES ('PAYMENT_COMPLETED', 101, JSON_OBJECT('order_id', 101, 'amount', 149.99));
COMMIT;
```

## Compensating Transaction: Payment Failed

```sql
USE payment_svc;

-- On gateway failure:
START TRANSACTION;
  UPDATE payments SET status = 'FAILED' WHERE order_id = 101;
  INSERT INTO outbox_events (event_type, aggregate_id, payload)
  VALUES ('PAYMENT_FAILED', 101,
    JSON_OBJECT('order_id', 101, 'reason', 'card_declined'));
COMMIT;
```

```sql
USE inventory_svc;

-- Compensation: release reservation on PAYMENT_FAILED
START TRANSACTION;
  UPDATE products
  SET reserved  = reserved  - 2,
      available = available + 2
  WHERE sku = 'SKU-001';
  INSERT INTO outbox_events (event_type, aggregate_id, payload)
  VALUES ('INVENTORY_RELEASED', 'SKU-001',
    JSON_OBJECT('order_id', 101));
COMMIT;
```

```sql
USE order_svc;

-- Compensation: cancel order on PAYMENT_FAILED
START TRANSACTION;
  UPDATE orders SET status = 'CANCELLED' WHERE id = 101;
  INSERT INTO outbox_events (event_type, aggregate_id, payload)
  VALUES ('ORDER_CANCELLED', 101,
    JSON_OBJECT('order_id', 101, 'reason', 'payment_failed'));
COMMIT;
```

## Saga State Tracking Table

Track the overall saga progress in the orchestrating service:

```sql
USE order_svc;

CREATE TABLE saga_state (
  order_id     BIGINT      NOT NULL PRIMARY KEY,
  current_step VARCHAR(50) NOT NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  started_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Update saga step on each event
UPDATE saga_state
SET current_step = 'PAYMENT_COMPLETED', status = 'IN_PROGRESS'
WHERE order_id = 101;

-- Mark saga complete
UPDATE saga_state
SET current_step = 'ORDER_CONFIRMED', status = 'COMPLETED'
WHERE order_id = 101;
```

## Summary

The Saga pattern with MySQL uses local InnoDB transactions at each step, an outbox table for reliable event publishing, and compensating transactions to roll back completed steps when a later step fails. Each service reacts to events from the previous step, ensuring the distributed workflow eventually reaches either a fully completed or fully compensated state without requiring a distributed locking coordinator.
