# How to Handle Cross-Shard Transactions in MySQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Sharding, Transaction, Distributed System, Architecture

Description: Learn strategies for handling cross-shard transactions in MySQL, including two-phase commit, saga pattern, and design choices to avoid distributed transactions.

---

## The Challenge of Cross-Shard Transactions

MySQL transactions provide ACID guarantees within a single database instance. When data spans multiple shards, a simple `BEGIN / COMMIT` no longer works - each shard is a separate MySQL server with no knowledge of the other's state. A failure after committing on shard A but before committing on shard B leaves data inconsistent.

## Option 1 - Avoid Distributed Transactions by Design

The best strategy is often to design the schema so that business operations that must be atomic all live on the same shard. Use the same shard key for all related tables:

```sql
-- Both orders and order_items share user_id as shard key
-- A user's orders and items always colocate on the same shard

CREATE TABLE orders (
  id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,  -- shard key
  amount DECIMAL(10,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,  -- shard key included
  product_id BIGINT UNSIGNED NOT NULL,
  quantity INT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB;
```

With colocated data, creating an order and its items is a single-shard transaction:

```python
def create_order_with_items(user_id, items):
    conn = get_shard(user_id)
    cursor = conn.cursor()
    conn.start_transaction()
    try:
        cursor.execute(
            "INSERT INTO orders (id, user_id, amount) VALUES (%s, %s, %s)",
            (new_order_id, user_id, total)
        )
        for item in items:
            cursor.execute(
                "INSERT INTO order_items (id, order_id, user_id, product_id, quantity) "
                "VALUES (%s, %s, %s, %s, %s)",
                (new_item_id(), new_order_id, user_id, item["product_id"], item["quantity"])
            )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
```

## Option 2 - Two-Phase Commit (2PC)

XA transactions implement distributed two-phase commit across multiple MySQL instances. Phase 1 prepares all participants; phase 2 commits only if all prepared successfully:

```python
import uuid

def transfer_funds_across_shards(from_user, to_user, amount):
    xid = str(uuid.uuid4())
    conn_a = get_shard(from_user)
    conn_b = get_shard(to_user)

    # Phase 1: Prepare
    try:
        conn_a.cursor().execute(f"XA START '{xid}-a'")
        conn_a.cursor().execute(
            "UPDATE wallets SET balance = balance - %s WHERE user_id = %s",
            (amount, from_user)
        )
        conn_a.cursor().execute(f"XA END '{xid}-a'")
        conn_a.cursor().execute(f"XA PREPARE '{xid}-a'")

        conn_b.cursor().execute(f"XA START '{xid}-b'")
        conn_b.cursor().execute(
            "UPDATE wallets SET balance = balance + %s WHERE user_id = %s",
            (amount, to_user)
        )
        conn_b.cursor().execute(f"XA END '{xid}-b'")
        conn_b.cursor().execute(f"XA PREPARE '{xid}-b'")

    except Exception:
        # Rollback whichever transactions reached the prepared state
        try:
            conn_a.cursor().execute(f"XA ROLLBACK '{xid}-a'")
        except Exception:
            pass
        try:
            conn_b.cursor().execute(f"XA ROLLBACK '{xid}-b'")
        except Exception:
            pass
        raise

    # Phase 2: Commit (once both are prepared, commits should succeed;
    # a failure here is the coordinator-crash scenario requiring manual resolution)
    conn_a.cursor().execute(f"XA COMMIT '{xid}-a'")
    conn_b.cursor().execute(f"XA COMMIT '{xid}-b'")
```

2PC has a blocking failure mode: if the coordinator crashes after prepare but before commit, participants are stuck with prepared transactions until manual resolution.

## Option 3 - Saga Pattern with Compensating Transactions

The saga pattern breaks a distributed operation into a series of local transactions. Each step publishes an event, and failures trigger compensating transactions to undo prior steps:

```sql
CREATE TABLE saga_log (
  saga_id CHAR(36) NOT NULL,
  step VARCHAR(100) NOT NULL,
  status ENUM('pending', 'done', 'compensated') NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (saga_id, step)
) ENGINE=InnoDB;
```

Each step is idempotent and can be retried. Compensating transactions roll back completed steps on failure:

```python
def transfer_saga(from_user, to_user, amount, saga_id):
    # Step 1: Debit from_user (shard A)
    debit_from_user(from_user, amount, saga_id)

    try:
        # Step 2: Credit to_user (shard B)
        credit_to_user(to_user, amount, saga_id)
    except Exception:
        # Compensate: refund from_user
        refund_user(from_user, amount, saga_id)
        raise
```

## Summary

Cross-shard transactions in MySQL are best avoided through careful schema design that colocates related data on the same shard. When unavoidable, use XA transactions for strong consistency with the understanding of coordinator failure risks, or adopt the saga pattern with compensating transactions for resilient eventually-consistent distributed operations.
