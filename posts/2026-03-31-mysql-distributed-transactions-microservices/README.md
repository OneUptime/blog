# How to Handle Distributed Transactions with MySQL in Microservices

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Distributed Transaction, Microservice, XA Transaction

Description: Learn how to handle distributed transactions across MySQL databases in microservices using XA transactions, the Saga pattern, and eventual consistency strategies.

---

## The Challenge of Distributed Transactions

In a microservices architecture, an operation like "place an order" may need to update three separate MySQL databases: deduct inventory in the product service, create an order in the order service, and initiate a payment in the payment service. Keeping all three consistent without a single transaction is the core challenge of distributed data management.

## Option 1 - XA Transactions (Two-Phase Commit)

MySQL supports XA transactions, which enable atomic commits across multiple database connections. All participating databases commit or roll back together.

```sql
-- Connection 1: Order Service database
XA START 'txn-order-001';
INSERT INTO order_svc.orders (user_id, total, status)
VALUES (42, 99.99, 'PENDING');
XA END 'txn-order-001';
XA PREPARE 'txn-order-001';

-- Connection 2: Inventory Service database
XA START 'txn-inventory-001';
UPDATE inventory_svc.products
SET reserved_stock = reserved_stock + 1
WHERE sku = 'SKU-001';
XA END 'txn-inventory-001';
XA PREPARE 'txn-inventory-001';

-- Both prepared - now commit both
XA COMMIT 'txn-order-001';
XA COMMIT 'txn-inventory-001';
```

If any participant fails to prepare, roll back all participants:

```sql
XA ROLLBACK 'txn-order-001';
XA ROLLBACK 'txn-inventory-001';
```

If a commit fails after prepare, do not roll back the other participants. Instead, retry the failed commit - `XA RECOVER` lists transactions stuck in the PREPARED state.

## XA Limitations

```text
- Performance overhead from two-phase coordination
- Blocking: if the coordinator fails between PREPARE and COMMIT, resources are locked
- Not supported with statement-based replication in older MySQL versions
- Complex failure recovery when a participant crashes after PREPARE
```

XA transactions work for tightly controlled environments but are brittle at scale.

## Option 2 - Saga Pattern (Recommended)

The Saga pattern breaks a distributed transaction into a sequence of local transactions, each with a compensating transaction that undoes its effect if a later step fails.

### Choreography-Based Saga

Each service publishes an event after its local transaction; the next service listens and reacts:

```sql
-- Order service: create order and publish event atomically
USE order_svc;

START TRANSACTION;
  INSERT INTO orders (user_id, total, status) VALUES (42, 99.99, 'PENDING');
  INSERT INTO outbox_events (event_type, payload)
  VALUES ('ORDER_CREATED', JSON_OBJECT(
    'order_id', LAST_INSERT_ID(),
    'user_id',  42,
    'total',    99.99
  ));
COMMIT;
```

The payment service listens to `ORDER_CREATED`, processes the payment, and publishes `PAYMENT_COMPLETED` or `PAYMENT_FAILED`. The order service subscribes and updates the order status accordingly.

### Compensating Transactions

```sql
-- Compensation: if payment fails, cancel the order
USE order_svc;
START TRANSACTION;
  UPDATE orders SET status = 'CANCELLED' WHERE id = ? AND status = 'PENDING';
  INSERT INTO outbox_events (event_type, payload)
  VALUES ('ORDER_CANCELLED', JSON_OBJECT('order_id', ?, 'reason', 'payment_failed'));
COMMIT;
```

## Option 3 - Eventual Consistency with Idempotent Operations

Design each service operation to be idempotent (safe to retry) and use an event log for coordination:

```sql
-- Idempotency key prevents double processing
USE payment_svc;

CREATE TABLE payment_attempts (
  idempotency_key VARCHAR(100) NOT NULL PRIMARY KEY,
  order_id        BIGINT       NOT NULL,
  amount          DECIMAL(12,2) NOT NULL,
  status          VARCHAR(20)   NOT NULL,
  created_at      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Use INSERT IGNORE to skip duplicate processing
INSERT IGNORE INTO payment_attempts (idempotency_key, order_id, amount, status)
VALUES ('order-42-attempt-1', 42, 99.99, 'PROCESSING');

-- Only proceed if the insert succeeded (new attempt)
SELECT ROW_COUNT() AS inserted;
```

## Outbox Pattern for Reliable Event Publishing

Use a transactional outbox to guarantee event publishing without losing messages:

```sql
USE order_svc;

CREATE TABLE outbox_events (
  id           BIGINT    NOT NULL AUTO_INCREMENT PRIMARY KEY,
  event_type   VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  payload      JSON         NOT NULL,
  published_at TIMESTAMP    NULL DEFAULT NULL,
  created_at   TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unpublished (published_at, created_at)
) ENGINE=InnoDB;

-- Atomically create the order and the event
START TRANSACTION;
  INSERT INTO orders (user_id, total, status) VALUES (42, 99.99, 'PENDING');
  INSERT INTO outbox_events (event_type, aggregate_id, payload)
  VALUES ('ORDER_CREATED', LAST_INSERT_ID(),
    JSON_OBJECT('order_id', LAST_INSERT_ID(), 'total', 99.99));
COMMIT;
```

A background process reads the outbox table and publishes events to a message broker.

## Summary

Distributed transactions in MySQL microservices can use XA for strict atomicity but this comes with performance and reliability trade-offs. The preferred approach is the Saga pattern: break the operation into local transactions, publish events via an outbox table, and handle failures with compensating transactions. Design all service operations to be idempotent to make retry-based eventual consistency safe and reliable.
