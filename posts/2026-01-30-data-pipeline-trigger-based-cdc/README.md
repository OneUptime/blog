# How to Create Trigger-Based CDC

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Data Pipeline, CDC, Database Triggers, Data Capture

Description: Learn to create trigger-based CDC for capturing data changes using database triggers and shadow tables.

---

> Change Data Capture (CDC) transforms your database from a passive data store into an active event source. Trigger-based CDC gives you fine-grained control over what changes you capture, when you capture them, and how you structure them for downstream systems.

When building data pipelines, one of the most fundamental challenges is knowing when data changes. Polling is wasteful and introduces latency. Log-based CDC requires specialized tooling and permissions. Trigger-based CDC sits in the middle: it uses native database features, works across most relational databases, and gives you complete control over the change capture logic.

This guide walks through designing, implementing, and optimizing trigger-based CDC for production data pipelines.

---

## Table of Contents

1. What is Trigger-Based CDC?
2. Architecture Overview
3. Change Table Design
4. Writing Effective Triggers
5. Capturing Different Change Types
6. Handling Batch Operations
7. Consumer Patterns
8. Performance Considerations
9. Monitoring and Alerting
10. Common Pitfalls
11. Complete Implementation Example

---

## 1. What is Trigger-Based CDC?

Trigger-based CDC uses database triggers to capture row-level changes (INSERT, UPDATE, DELETE) and write them to dedicated change tables. Downstream consumers then read from these change tables to process changes incrementally.

| CDC Approach | Pros | Cons |
|--------------|------|------|
| Polling | Simple, no schema changes | High latency, resource intensive, misses intermediate states |
| Log-based (Debezium, etc.) | Low latency, captures all changes | Requires log access, complex setup, vendor-specific |
| Trigger-based | Native SQL, fine-grained control, portable | Transaction overhead, requires schema changes |

When to use trigger-based CDC:

- You need immediate capture without external tooling
- You want selective capture (only certain columns or conditions)
- Your database does not expose transaction logs
- You need custom transformation at capture time
- You want a portable solution across database vendors

---

## 2. Architecture Overview

The trigger-based CDC architecture consists of three main components:

```mermaid
flowchart LR
    subgraph Source["Source Database"]
        T[Source Table]
        TR[Triggers]
        CT[Change Table]
    end

    subgraph Pipeline["Data Pipeline"]
        C[Consumer Process]
        Q[Message Queue]
    end

    subgraph Downstream["Downstream Systems"]
        DW[Data Warehouse]
        CACHE[Cache Layer]
        SEARCH[Search Index]
    end

    T -->|INSERT/UPDATE/DELETE| TR
    TR -->|Capture Change| CT
    CT -->|Poll Changes| C
    C -->|Publish| Q
    Q --> DW
    Q --> CACHE
    Q --> SEARCH
```

The flow works as follows:

1. Application modifies data in the source table
2. Database fires the appropriate trigger (AFTER INSERT, UPDATE, or DELETE)
3. Trigger writes change metadata to the change table
4. Consumer process polls the change table for new entries
5. Consumer publishes changes to downstream systems
6. Consumer marks changes as processed

---

## 3. Change Table Design

The change table is the heart of trigger-based CDC. A well-designed change table captures everything downstream systems need while remaining efficient to write and query.

### Core Schema

```sql
-- PostgreSQL example: Change table for capturing modifications
CREATE TABLE order_changes (
    -- Unique identifier for this change event
    change_id BIGSERIAL PRIMARY KEY,

    -- What happened: INSERT, UPDATE, or DELETE
    operation VARCHAR(10) NOT NULL,

    -- When the change occurred (transaction timestamp)
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- The primary key of the affected row
    order_id BIGINT NOT NULL,

    -- Before state (NULL for INSERT)
    old_data JSONB,

    -- After state (NULL for DELETE)
    new_data JSONB,

    -- Which columns changed (for UPDATE operations)
    changed_columns TEXT[],

    -- Processing metadata
    processed_at TIMESTAMPTZ,
    processed_by VARCHAR(100),

    -- Transaction context (useful for debugging)
    transaction_id BIGINT DEFAULT txid_current(),
    session_user_name VARCHAR(100) DEFAULT SESSION_USER
);

-- Index for efficient consumer queries
-- Consumers typically query: unprocessed changes ordered by change_id
CREATE INDEX idx_order_changes_unprocessed
    ON order_changes (change_id)
    WHERE processed_at IS NULL;

-- Index for looking up changes by source row
CREATE INDEX idx_order_changes_order_id
    ON order_changes (order_id, change_id);

-- Index for time-based queries and cleanup
CREATE INDEX idx_order_changes_changed_at
    ON order_changes (changed_at);
```

### Design Decisions Explained

**JSONB for old/new data**: Storing the full row as JSON provides flexibility. Downstream systems can extract what they need without schema coupling. If the source table schema changes, existing change records remain valid.

**changed_columns array**: For UPDATE operations, knowing which columns changed enables smarter downstream processing. A consumer might only care about price changes, not description updates.

**Monotonic change_id**: Using a SERIAL/BIGSERIAL ensures changes have a total order. Consumers can checkpoint their position and resume without missing or duplicating changes.

**Partial index for unprocessed**: The WHERE clause on the index keeps it small. Once changes are processed, they fall out of the index automatically.

### Alternative: Partitioned Change Tables

For high-volume systems, partition the change table by time:

```sql
-- Partitioned change table for high-volume scenarios
CREATE TABLE order_changes (
    change_id BIGSERIAL,
    operation VARCHAR(10) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    order_id BIGINT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_columns TEXT[],
    processed_at TIMESTAMPTZ,
    PRIMARY KEY (change_id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Create partitions for each day
-- Automate this with pg_partman or a scheduled job
CREATE TABLE order_changes_2026_01_30
    PARTITION OF order_changes
    FOR VALUES FROM ('2026-01-30') TO ('2026-01-31');

CREATE TABLE order_changes_2026_01_31
    PARTITION OF order_changes
    FOR VALUES FROM ('2026-01-31') TO ('2026-02-01');
```

Partitioning enables efficient cleanup: drop old partitions instead of deleting rows.

---

## 4. Writing Effective Triggers

Triggers must be fast, reliable, and capture complete change information. Here is the fundamental pattern:

### Basic Trigger Structure

```sql
-- Function that handles all change types for the orders table
CREATE OR REPLACE FUNCTION capture_order_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_columns TEXT[];
BEGIN
    -- Determine operation type and set appropriate data
    IF TG_OP = 'INSERT' THEN
        -- INSERT: no old data, capture new row
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
        v_changed_columns := NULL;

    ELSIF TG_OP = 'UPDATE' THEN
        -- UPDATE: capture both states and identify changed columns
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);

        -- Build array of columns that actually changed
        -- This compares JSONB representations to detect changes
        SELECT ARRAY_AGG(key)
        INTO v_changed_columns
        FROM (
            SELECT key
            FROM jsonb_each(v_new_data)
            EXCEPT
            SELECT key
            FROM jsonb_each(v_old_data)
            WHERE v_old_data->key = v_new_data->key
        ) changed;

        -- Skip if nothing actually changed (can happen with some ORMs)
        IF v_changed_columns IS NULL OR array_length(v_changed_columns, 1) IS NULL THEN
            RETURN NEW;
        END IF;

    ELSIF TG_OP = 'DELETE' THEN
        -- DELETE: capture old data, no new data
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
        v_changed_columns := NULL;
    END IF;

    -- Insert the change record
    INSERT INTO order_changes (
        operation,
        order_id,
        old_data,
        new_data,
        changed_columns
    ) VALUES (
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        v_old_data,
        v_new_data,
        v_changed_columns
    );

    -- Return appropriate row reference
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger to source table
-- AFTER trigger ensures we capture the final committed state
CREATE TRIGGER trg_orders_capture_changes
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION capture_order_changes();
```

### Key Design Points

**AFTER vs BEFORE triggers**: Use AFTER triggers for CDC. The change has already been validated and will be committed. BEFORE triggers can see changes that later fail constraint checks.

**FOR EACH ROW**: CDC requires row-level triggers to capture individual changes. Statement-level triggers only fire once per statement regardless of affected rows.

**Return value**: AFTER triggers must return NEW (or OLD for DELETE) to allow the operation to complete. Returning NULL would cancel the operation.

**Skip no-op updates**: ORMs sometimes issue UPDATE statements that do not actually change values. Detecting and skipping these reduces noise in the change table.

---

## 5. Capturing Different Change Types

Each operation type has unique considerations:

### INSERT Handling

```sql
-- Focused INSERT trigger with selective column capture
CREATE OR REPLACE FUNCTION capture_order_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_changes (
        operation,
        order_id,
        new_data
    ) VALUES (
        'INSERT',
        NEW.id,
        -- Capture only columns relevant to downstream systems
        jsonb_build_object(
            'id', NEW.id,
            'customer_id', NEW.customer_id,
            'total_amount', NEW.total_amount,
            'status', NEW.status,
            'created_at', NEW.created_at
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### UPDATE Handling with Column Filtering

```sql
-- UPDATE trigger that only captures specific column changes
CREATE OR REPLACE FUNCTION capture_order_update()
RETURNS TRIGGER AS $$
DECLARE
    v_tracked_columns TEXT[] := ARRAY['status', 'total_amount', 'shipping_address'];
    v_changed_columns TEXT[];
BEGIN
    -- Check which tracked columns actually changed
    SELECT ARRAY_AGG(col)
    INTO v_changed_columns
    FROM unnest(v_tracked_columns) AS col
    WHERE to_jsonb(NEW)->>col IS DISTINCT FROM to_jsonb(OLD)->>col;

    -- Skip if none of our tracked columns changed
    IF v_changed_columns IS NULL OR array_length(v_changed_columns, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    INSERT INTO order_changes (
        operation,
        order_id,
        old_data,
        new_data,
        changed_columns
    ) VALUES (
        'UPDATE',
        NEW.id,
        -- Only include tracked columns in the payload
        jsonb_build_object(
            'status', OLD.status,
            'total_amount', OLD.total_amount,
            'shipping_address', OLD.shipping_address
        ),
        jsonb_build_object(
            'status', NEW.status,
            'total_amount', NEW.total_amount,
            'shipping_address', NEW.shipping_address
        ),
        v_changed_columns
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### DELETE Handling with Soft Delete Detection

```sql
-- DELETE trigger that distinguishes hard vs soft deletes
CREATE OR REPLACE FUNCTION capture_order_delete()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_changes (
        operation,
        order_id,
        old_data,
        -- Include metadata about deletion context
        new_data
    ) VALUES (
        'DELETE',
        OLD.id,
        to_jsonb(OLD),
        -- Capture who deleted and why if available from session
        jsonb_build_object(
            'deleted_by', current_setting('app.current_user', true),
            'deletion_reason', current_setting('app.deletion_reason', true)
        )
    );
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;
```

---

## 6. Handling Batch Operations

Batch operations can overwhelm the change table. Consider these strategies:

### Batch-Aware Trigger

```sql
-- Trigger that detects batch operations and handles them efficiently
CREATE OR REPLACE FUNCTION capture_order_changes_batch_aware()
RETURNS TRIGGER AS $$
DECLARE
    v_batch_id UUID;
    v_is_batch BOOLEAN;
BEGIN
    -- Check if this is part of a batch operation
    -- Application sets this before bulk operations
    v_batch_id := current_setting('app.batch_id', true)::UUID;
    v_is_batch := v_batch_id IS NOT NULL;

    IF v_is_batch THEN
        -- For batch operations, capture minimal data
        -- A separate batch summary record handles the details
        INSERT INTO order_changes (
            operation,
            order_id,
            new_data
        ) VALUES (
            TG_OP,
            COALESCE(NEW.id, OLD.id),
            jsonb_build_object(
                'batch_id', v_batch_id,
                'batch_mode', true
            )
        );
    ELSE
        -- For single-row operations, capture full details
        INSERT INTO order_changes (
            operation,
            order_id,
            old_data,
            new_data
        ) VALUES (
            TG_OP,
            COALESCE(NEW.id, OLD.id),
            CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END,
            CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END
        );
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### Application-Side Batch Handling

```python
# Python example: Wrapping batch operations with context
import psycopg2
import uuid

def bulk_update_orders(conn, order_updates):
    """
    Perform bulk updates with batch tracking.
    The trigger will detect the batch context and adjust its behavior.
    """
    batch_id = str(uuid.uuid4())

    with conn.cursor() as cur:
        # Set batch context for triggers to detect
        cur.execute(
            "SELECT set_config('app.batch_id', %s, true)",
            (batch_id,)
        )

        # Record batch metadata before individual operations
        cur.execute("""
            INSERT INTO batch_operations (
                batch_id,
                operation_type,
                table_name,
                record_count,
                started_at
            ) VALUES (%s, %s, %s, %s, NOW())
        """, (batch_id, 'UPDATE', 'orders', len(order_updates)))

        # Perform the actual updates
        for order_id, new_status in order_updates:
            cur.execute(
                "UPDATE orders SET status = %s WHERE id = %s",
                (new_status, order_id)
            )

        # Mark batch complete
        cur.execute("""
            UPDATE batch_operations
            SET completed_at = NOW()
            WHERE batch_id = %s
        """, (batch_id,))

    conn.commit()
    return batch_id
```

---

## 7. Consumer Patterns

The consumer is equally important as the capture mechanism. Here are proven patterns:

### Basic Polling Consumer

```python
# Python consumer using psycopg2
import psycopg2
import json
import time
from datetime import datetime

class CDCConsumer:
    """
    Polls the change table and processes changes in order.
    Implements checkpointing for exactly-once semantics.
    """

    def __init__(self, dsn, batch_size=100):
        self.dsn = dsn
        self.batch_size = batch_size
        self.consumer_id = f"consumer-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    def get_connection(self):
        return psycopg2.connect(self.dsn)

    def fetch_changes(self, conn):
        """
        Fetch unprocessed changes in order.
        Uses SELECT FOR UPDATE SKIP LOCKED for concurrent consumers.
        """
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    change_id,
                    operation,
                    order_id,
                    old_data,
                    new_data,
                    changed_columns,
                    changed_at
                FROM order_changes
                WHERE processed_at IS NULL
                ORDER BY change_id
                LIMIT %s
                FOR UPDATE SKIP LOCKED
            """, (self.batch_size,))

            columns = [desc[0] for desc in cur.description]
            return [dict(zip(columns, row)) for row in cur.fetchall()]

    def mark_processed(self, conn, change_ids):
        """Mark changes as processed with consumer identification."""
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE order_changes
                SET
                    processed_at = NOW(),
                    processed_by = %s
                WHERE change_id = ANY(%s)
            """, (self.consumer_id, change_ids))

    def process_change(self, change):
        """
        Override this method to implement your processing logic.
        Returns True if processing succeeded, False to retry later.
        """
        print(f"Processing {change['operation']} on order {change['order_id']}")

        if change['operation'] == 'INSERT':
            # Handle new order
            self.handle_insert(change)
        elif change['operation'] == 'UPDATE':
            # Handle order modification
            self.handle_update(change)
        elif change['operation'] == 'DELETE':
            # Handle order removal
            self.handle_delete(change)

        return True

    def handle_insert(self, change):
        """Process INSERT changes - publish to downstream systems."""
        new_data = change['new_data']
        # Example: Publish to message queue, update cache, index in search
        print(f"  New order created: {json.dumps(new_data, default=str)}")

    def handle_update(self, change):
        """Process UPDATE changes - sync modified data."""
        changed_cols = change['changed_columns'] or []
        print(f"  Order updated. Changed columns: {changed_cols}")

        # Selective processing based on what changed
        if 'status' in changed_cols:
            old_status = change['old_data'].get('status')
            new_status = change['new_data'].get('status')
            print(f"  Status transition: {old_status} -> {new_status}")

    def handle_delete(self, change):
        """Process DELETE changes - remove from downstream systems."""
        print(f"  Order deleted: {change['order_id']}")

    def run(self, poll_interval=1.0):
        """
        Main consumer loop.
        Polls for changes, processes them, and marks as complete.
        """
        print(f"Starting CDC consumer: {self.consumer_id}")

        while True:
            try:
                with self.get_connection() as conn:
                    changes = self.fetch_changes(conn)

                    if not changes:
                        time.sleep(poll_interval)
                        continue

                    processed_ids = []
                    for change in changes:
                        try:
                            if self.process_change(change):
                                processed_ids.append(change['change_id'])
                        except Exception as e:
                            print(f"Error processing change {change['change_id']}: {e}")
                            # Skip this change for now, will retry on next poll
                            continue

                    if processed_ids:
                        self.mark_processed(conn, processed_ids)
                        conn.commit()
                        print(f"Processed {len(processed_ids)} changes")

            except Exception as e:
                print(f"Consumer error: {e}")
                time.sleep(poll_interval * 5)  # Back off on errors


# Usage
if __name__ == "__main__":
    consumer = CDCConsumer(
        dsn="postgresql://user:pass@localhost/mydb",
        batch_size=100
    )
    consumer.run(poll_interval=0.5)
```

### Consumer Architecture Diagram

```mermaid
flowchart TB
    subgraph Database["PostgreSQL"]
        CT[Change Table]
    end

    subgraph Consumers["Consumer Pool"]
        C1[Consumer 1]
        C2[Consumer 2]
        C3[Consumer 3]
    end

    subgraph Processing["Processing Layer"]
        VALID[Validation]
        TRANSFORM[Transform]
        ROUTE[Router]
    end

    subgraph Destinations["Destinations"]
        KAFKA[Kafka Topic]
        ES[Elasticsearch]
        REDIS[Redis Cache]
        WEBHOOK[Webhooks]
    end

    CT -->|FOR UPDATE SKIP LOCKED| C1
    CT -->|FOR UPDATE SKIP LOCKED| C2
    CT -->|FOR UPDATE SKIP LOCKED| C3

    C1 --> VALID
    C2 --> VALID
    C3 --> VALID

    VALID --> TRANSFORM
    TRANSFORM --> ROUTE

    ROUTE --> KAFKA
    ROUTE --> ES
    ROUTE --> REDIS
    ROUTE --> WEBHOOK
```

---

## 8. Performance Considerations

Trigger-based CDC adds overhead to every write operation. Here is how to minimize impact:

### Trigger Performance Best Practices

```sql
-- GOOD: Minimal trigger that defers work
CREATE OR REPLACE FUNCTION capture_order_changes_fast()
RETURNS TRIGGER AS $$
BEGIN
    -- Minimal processing in trigger
    -- No complex logic, no external calls, no large computations
    INSERT INTO order_changes (operation, order_id, new_data)
    VALUES (
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        CASE
            WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD)
            ELSE to_jsonb(NEW)
        END
    );

    RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$ LANGUAGE plpgsql;

-- BAD: Slow trigger with unnecessary work
CREATE OR REPLACE FUNCTION capture_order_changes_slow()
RETURNS TRIGGER AS $$
DECLARE
    v_customer_email TEXT;
    v_notification_sent BOOLEAN;
BEGIN
    -- BAD: Querying other tables in trigger
    SELECT email INTO v_customer_email
    FROM customers WHERE id = NEW.customer_id;

    -- BAD: External HTTP calls (never do this)
    -- v_notification_sent := http_post('https://api.example.com/notify', ...);

    -- BAD: Complex aggregations
    -- SELECT COUNT(*), SUM(total) INTO ... FROM orders WHERE customer_id = NEW.customer_id;

    INSERT INTO order_changes (...) VALUES (...);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Index Strategy

```sql
-- Essential indexes for CDC tables

-- 1. Consumer query index (most critical)
-- Covers the typical consumer query pattern
CREATE INDEX CONCURRENTLY idx_changes_consumer_query
    ON order_changes (change_id)
    WHERE processed_at IS NULL;

-- 2. Source row lookup (for debugging and reprocessing)
CREATE INDEX CONCURRENTLY idx_changes_by_source
    ON order_changes (order_id, change_id DESC);

-- 3. Time-based queries (for cleanup and analytics)
CREATE INDEX CONCURRENTLY idx_changes_by_time
    ON order_changes (changed_at DESC);

-- 4. Operation type filtering (if consumers filter by operation)
CREATE INDEX CONCURRENTLY idx_changes_by_operation
    ON order_changes (operation, change_id)
    WHERE processed_at IS NULL;
```

### Cleanup Strategy

```sql
-- Automated cleanup of processed changes
-- Run this as a scheduled job (pg_cron, external scheduler, etc.)

CREATE OR REPLACE FUNCTION cleanup_processed_changes(
    retention_days INTEGER DEFAULT 7
)
RETURNS BIGINT AS $$
DECLARE
    v_deleted BIGINT;
BEGIN
    -- Delete in batches to avoid long locks
    WITH deleted AS (
        DELETE FROM order_changes
        WHERE change_id IN (
            SELECT change_id
            FROM order_changes
            WHERE processed_at < NOW() - (retention_days || ' days')::INTERVAL
            LIMIT 10000
            FOR UPDATE SKIP LOCKED
        )
        RETURNING 1
    )
    SELECT COUNT(*) INTO v_deleted FROM deleted;

    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

-- For partitioned tables, drop old partitions instead
-- This is much faster than DELETE
DROP TABLE IF EXISTS order_changes_2026_01_15;
```

### Performance Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Trigger execution time (p99) | > 10ms | > 50ms |
| Change table size (unprocessed) | > 100,000 rows | > 1,000,000 rows |
| Consumer lag (oldest unprocessed) | > 5 minutes | > 30 minutes |
| Change table disk usage | > 10GB | > 50GB |

---

## 9. Monitoring and Alerting

Effective monitoring catches problems before they impact downstream systems:

### Monitoring Queries

```sql
-- View: CDC system health dashboard
CREATE OR REPLACE VIEW cdc_health AS
SELECT
    -- Backlog metrics
    COUNT(*) FILTER (WHERE processed_at IS NULL) AS unprocessed_count,
    COUNT(*) FILTER (WHERE processed_at IS NOT NULL) AS processed_today,

    -- Lag metrics
    NOW() - MIN(changed_at) FILTER (WHERE processed_at IS NULL) AS max_lag,

    -- Throughput (last hour)
    COUNT(*) FILTER (
        WHERE processed_at > NOW() - INTERVAL '1 hour'
    ) AS processed_last_hour,

    -- Error indicators
    COUNT(*) FILTER (
        WHERE processed_at IS NULL
        AND changed_at < NOW() - INTERVAL '10 minutes'
    ) AS stale_changes,

    -- Storage
    pg_size_pretty(pg_total_relation_size('order_changes')) AS table_size

FROM order_changes
WHERE changed_at > NOW() - INTERVAL '24 hours';

-- Query to identify stuck changes
SELECT
    change_id,
    operation,
    order_id,
    changed_at,
    NOW() - changed_at AS age
FROM order_changes
WHERE processed_at IS NULL
AND changed_at < NOW() - INTERVAL '30 minutes'
ORDER BY changed_at
LIMIT 100;

-- Consumer activity monitoring
SELECT
    processed_by,
    COUNT(*) AS changes_processed,
    MIN(processed_at) AS first_processed,
    MAX(processed_at) AS last_processed,
    AVG(EXTRACT(EPOCH FROM (processed_at - changed_at))) AS avg_lag_seconds
FROM order_changes
WHERE processed_at > NOW() - INTERVAL '1 hour'
GROUP BY processed_by
ORDER BY changes_processed DESC;
```

### Alert Definitions

```yaml
# Example Prometheus alerting rules for CDC monitoring
groups:
  - name: cdc_alerts
    rules:
      - alert: CDCBacklogHigh
        expr: cdc_unprocessed_changes > 100000
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CDC backlog exceeds 100k changes"

      - alert: CDCBacklogCritical
        expr: cdc_unprocessed_changes > 1000000
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "CDC backlog exceeds 1M changes - consumer may be stuck"

      - alert: CDCLagHigh
        expr: cdc_max_lag_seconds > 300
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "CDC lag exceeds 5 minutes"

      - alert: CDCConsumerInactive
        expr: rate(cdc_changes_processed_total[5m]) == 0
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "CDC consumer has not processed changes in 10 minutes"
```

---

## 10. Common Pitfalls

### Pitfall 1: Trigger Recursion

```sql
-- WRONG: This trigger can cause infinite recursion
CREATE OR REPLACE FUNCTION bad_recursive_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- This UPDATE will fire the trigger again!
    UPDATE orders SET updated_at = NOW() WHERE id = NEW.id;

    INSERT INTO order_changes (...) VALUES (...);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SOLUTION: Use pg_trigger_depth() to prevent recursion
CREATE OR REPLACE FUNCTION safe_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- Skip if this is a recursive trigger call
    IF pg_trigger_depth() > 1 THEN
        RETURN NEW;
    END IF;

    -- Safe to proceed with capture logic
    INSERT INTO order_changes (...) VALUES (...);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Pitfall 2: Missing Transaction Boundaries

```sql
-- WRONG: Consumer marks processed before downstream completes
-- If downstream fails, the change is lost

-- CORRECT: Use transactions that span the entire operation
BEGIN;
    -- Fetch and lock changes
    SELECT * FROM order_changes
    WHERE processed_at IS NULL
    FOR UPDATE SKIP LOCKED;

    -- Process and send to downstream
    -- (application code)

    -- Only mark processed AFTER downstream confirms
    UPDATE order_changes SET processed_at = NOW() WHERE change_id = ...;
COMMIT;
```

### Pitfall 3: Lost Changes During Schema Migration

```sql
-- WRONG: Dropping and recreating trigger loses in-flight changes

-- CORRECT: Use transaction to swap triggers atomically
BEGIN;
    -- Disable the old trigger
    ALTER TABLE orders DISABLE TRIGGER trg_orders_capture_changes;

    -- Create or replace the function with new logic
    CREATE OR REPLACE FUNCTION capture_order_changes() ...;

    -- Re-enable the trigger
    ALTER TABLE orders ENABLE TRIGGER trg_orders_capture_changes;
COMMIT;
```

### Pitfall 4: JSONB Size Explosion

```sql
-- WRONG: Capturing large text fields bloats the change table
-- If orders.description is 100KB, each change record is huge

-- CORRECT: Selective column capture
CREATE OR REPLACE FUNCTION capture_order_changes_selective()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO order_changes (operation, order_id, new_data)
    VALUES (
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        -- Only capture the columns downstream systems need
        jsonb_build_object(
            'id', NEW.id,
            'status', NEW.status,
            'total', NEW.total_amount,
            'updated_at', NEW.updated_at
            -- Intentionally exclude: description, notes, attachments
        )
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 11. Complete Implementation Example

Here is a complete, production-ready implementation:

### Schema Setup

```sql
-- Source table: orders
CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    customer_id BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10,2) NOT NULL,
    shipping_address JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Change capture table with partitioning
CREATE TABLE order_changes (
    change_id BIGSERIAL,
    operation VARCHAR(10) NOT NULL,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    order_id BIGINT NOT NULL,
    old_data JSONB,
    new_data JSONB,
    changed_columns TEXT[],
    processed_at TIMESTAMPTZ,
    processed_by VARCHAR(100),
    PRIMARY KEY (change_id, changed_at)
) PARTITION BY RANGE (changed_at);

-- Create initial partitions (automate with pg_partman in production)
CREATE TABLE order_changes_default PARTITION OF order_changes DEFAULT;

-- Indexes
CREATE INDEX idx_order_changes_unprocessed
    ON order_changes (change_id)
    WHERE processed_at IS NULL;

CREATE INDEX idx_order_changes_order_id
    ON order_changes (order_id, change_id);
```

### Trigger Function

```sql
-- Production trigger function with all best practices
CREATE OR REPLACE FUNCTION capture_order_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_old_data JSONB;
    v_new_data JSONB;
    v_changed_columns TEXT[];
    v_tracked_columns TEXT[] := ARRAY[
        'status', 'total_amount', 'shipping_address', 'customer_id'
    ];
BEGIN
    -- Prevent recursion
    IF pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
    END IF;

    -- Build change record based on operation
    CASE TG_OP
        WHEN 'INSERT' THEN
            v_new_data := jsonb_build_object(
                'id', NEW.id,
                'customer_id', NEW.customer_id,
                'status', NEW.status,
                'total_amount', NEW.total_amount,
                'shipping_address', NEW.shipping_address,
                'created_at', NEW.created_at
            );

        WHEN 'UPDATE' THEN
            -- Identify which tracked columns changed
            SELECT ARRAY_AGG(col)
            INTO v_changed_columns
            FROM unnest(v_tracked_columns) AS col
            WHERE to_jsonb(NEW)->>col IS DISTINCT FROM to_jsonb(OLD)->>col;

            -- Skip if no tracked columns changed
            IF v_changed_columns IS NULL THEN
                RETURN NEW;
            END IF;

            v_old_data := jsonb_build_object(
                'id', OLD.id,
                'customer_id', OLD.customer_id,
                'status', OLD.status,
                'total_amount', OLD.total_amount,
                'shipping_address', OLD.shipping_address
            );

            v_new_data := jsonb_build_object(
                'id', NEW.id,
                'customer_id', NEW.customer_id,
                'status', NEW.status,
                'total_amount', NEW.total_amount,
                'shipping_address', NEW.shipping_address,
                'updated_at', NEW.updated_at
            );

        WHEN 'DELETE' THEN
            v_old_data := jsonb_build_object(
                'id', OLD.id,
                'customer_id', OLD.customer_id,
                'status', OLD.status,
                'total_amount', OLD.total_amount
            );
    END CASE;

    -- Insert change record
    INSERT INTO order_changes (
        operation,
        order_id,
        old_data,
        new_data,
        changed_columns
    ) VALUES (
        TG_OP,
        COALESCE(NEW.id, OLD.id),
        v_old_data,
        v_new_data,
        v_changed_columns
    );

    -- Return appropriate value
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;

EXCEPTION WHEN OTHERS THEN
    -- Log error but do not block the original operation
    RAISE WARNING 'CDC trigger error: %', SQLERRM;
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql;

-- Attach trigger
CREATE TRIGGER trg_orders_cdc
    AFTER INSERT OR UPDATE OR DELETE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION capture_order_changes();
```

### Consumer Application

```python
#!/usr/bin/env python3
"""
Production CDC Consumer for Order Changes

Features:
- Concurrent processing with multiple workers
- Exactly-once semantics via database transactions
- Graceful shutdown handling
- Comprehensive error handling and retry logic
- Metrics emission for monitoring
"""

import psycopg2
import psycopg2.pool
import json
import time
import signal
import threading
from datetime import datetime
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from contextlib import contextmanager


@dataclass
class Change:
    """Represents a single change event from the CDC table."""
    change_id: int
    operation: str
    order_id: int
    old_data: Optional[Dict]
    new_data: Optional[Dict]
    changed_columns: Optional[List[str]]
    changed_at: datetime


class CDCConsumer:
    """
    Production-ready CDC consumer with support for:
    - Connection pooling
    - Concurrent consumers using SKIP LOCKED
    - Graceful shutdown
    - Dead letter queue for failed changes
    """

    def __init__(
        self,
        dsn: str,
        consumer_id: str,
        batch_size: int = 100,
        poll_interval: float = 1.0,
        max_retries: int = 3
    ):
        self.dsn = dsn
        self.consumer_id = consumer_id
        self.batch_size = batch_size
        self.poll_interval = poll_interval
        self.max_retries = max_retries
        self.running = False
        self.pool = None

        # Metrics
        self.processed_count = 0
        self.error_count = 0
        self.last_processed_at = None

    def start(self):
        """Initialize connection pool and start processing."""
        self.pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=2,
            maxconn=10,
            dsn=self.dsn
        )
        self.running = True

        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._shutdown_handler)
        signal.signal(signal.SIGTERM, self._shutdown_handler)

        print(f"CDC Consumer {self.consumer_id} started")
        self._run_loop()

    def _shutdown_handler(self, signum, frame):
        """Handle shutdown signals gracefully."""
        print(f"Received signal {signum}, initiating graceful shutdown...")
        self.running = False

    @contextmanager
    def _get_connection(self):
        """Get connection from pool with automatic return."""
        conn = self.pool.getconn()
        try:
            yield conn
        finally:
            self.pool.putconn(conn)

    def _fetch_changes(self, conn) -> List[Change]:
        """
        Fetch unprocessed changes using SKIP LOCKED for concurrency.
        Returns list of Change objects.
        """
        with conn.cursor() as cur:
            cur.execute("""
                SELECT
                    change_id,
                    operation,
                    order_id,
                    old_data,
                    new_data,
                    changed_columns,
                    changed_at
                FROM order_changes
                WHERE processed_at IS NULL
                ORDER BY change_id
                LIMIT %s
                FOR UPDATE SKIP LOCKED
            """, (self.batch_size,))

            changes = []
            for row in cur.fetchall():
                changes.append(Change(
                    change_id=row[0],
                    operation=row[1],
                    order_id=row[2],
                    old_data=row[3],
                    new_data=row[4],
                    changed_columns=row[5],
                    changed_at=row[6]
                ))
            return changes

    def _mark_processed(self, conn, change_ids: List[int]):
        """Mark changes as successfully processed."""
        with conn.cursor() as cur:
            cur.execute("""
                UPDATE order_changes
                SET
                    processed_at = NOW(),
                    processed_by = %s
                WHERE change_id = ANY(%s)
            """, (self.consumer_id, change_ids))

    def _send_to_dead_letter(self, conn, change: Change, error: str):
        """Move failed change to dead letter table for manual review."""
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO order_changes_dead_letter (
                    original_change_id,
                    operation,
                    order_id,
                    old_data,
                    new_data,
                    error_message,
                    failed_at
                ) VALUES (%s, %s, %s, %s, %s, %s, NOW())
            """, (
                change.change_id,
                change.operation,
                change.order_id,
                json.dumps(change.old_data) if change.old_data else None,
                json.dumps(change.new_data) if change.new_data else None,
                error
            ))

    def process_change(self, change: Change) -> bool:
        """
        Process a single change. Override this method for custom logic.
        Returns True on success, False on failure.
        """
        try:
            if change.operation == 'INSERT':
                self._handle_insert(change)
            elif change.operation == 'UPDATE':
                self._handle_update(change)
            elif change.operation == 'DELETE':
                self._handle_delete(change)
            return True
        except Exception as e:
            print(f"Error processing change {change.change_id}: {e}")
            return False

    def _handle_insert(self, change: Change):
        """Handle INSERT operations - publish new order event."""
        print(f"[INSERT] Order {change.order_id} created")
        # Example: Publish to Kafka, update search index, etc.
        # kafka_producer.send('orders.created', change.new_data)

    def _handle_update(self, change: Change):
        """Handle UPDATE operations - publish order modified event."""
        changed = change.changed_columns or []
        print(f"[UPDATE] Order {change.order_id} modified: {changed}")

        # Example: React to specific changes
        if 'status' in changed:
            old_status = change.old_data.get('status') if change.old_data else None
            new_status = change.new_data.get('status') if change.new_data else None
            print(f"  Status: {old_status} -> {new_status}")
            # kafka_producer.send('orders.status_changed', {...})

    def _handle_delete(self, change: Change):
        """Handle DELETE operations - publish order removed event."""
        print(f"[DELETE] Order {change.order_id} removed")
        # Example: Remove from cache, search index, etc.

    def _run_loop(self):
        """Main processing loop."""
        while self.running:
            try:
                with self._get_connection() as conn:
                    # Start transaction
                    conn.autocommit = False

                    changes = self._fetch_changes(conn)

                    if not changes:
                        conn.rollback()
                        time.sleep(self.poll_interval)
                        continue

                    processed_ids = []
                    for change in changes:
                        if self.process_change(change):
                            processed_ids.append(change.change_id)
                            self.processed_count += 1
                        else:
                            self.error_count += 1
                            # Send to dead letter after max retries
                            self._send_to_dead_letter(
                                conn,
                                change,
                                "Processing failed"
                            )
                            processed_ids.append(change.change_id)

                    if processed_ids:
                        self._mark_processed(conn, processed_ids)
                        conn.commit()
                        self.last_processed_at = datetime.now()
                        print(f"Batch complete: {len(processed_ids)} changes")
                    else:
                        conn.rollback()

            except Exception as e:
                print(f"Consumer loop error: {e}")
                time.sleep(self.poll_interval * 5)

        # Cleanup on shutdown
        if self.pool:
            self.pool.closeall()
        print(f"Consumer {self.consumer_id} shut down. "
              f"Processed: {self.processed_count}, Errors: {self.error_count}")


if __name__ == "__main__":
    consumer = CDCConsumer(
        dsn="postgresql://user:password@localhost:5432/mydb",
        consumer_id="worker-1",
        batch_size=100,
        poll_interval=0.5
    )
    consumer.start()
```

---

## Summary

Trigger-based CDC provides a reliable, portable approach to capturing data changes for pipelines. The key principles:

| Principle | Implementation |
|-----------|----------------|
| Keep triggers fast | Minimal logic, no external calls, selective column capture |
| Design for consumers | Monotonic IDs, partial indexes, SKIP LOCKED for concurrency |
| Plan for failure | Dead letter queues, transaction boundaries, graceful shutdown |
| Monitor proactively | Track backlog size, consumer lag, and processing throughput |
| Clean up regularly | Partition tables, drop old data, vacuum frequently |

Trigger-based CDC works best when you need fine-grained control over change capture without external dependencies. For higher throughput requirements or when transaction log access is available, consider log-based CDC tools like Debezium as a complement or alternative.

---

**Related Reading:**

- [When Performance Matters, Skip the ORM](https://oneuptime.com/blog/post/2025-11-13-when-performance-matters-skip-the-orm/view) - Relevant techniques for optimizing database access patterns.
- [What is OpenTelemetry Collector and Why Use One](https://oneuptime.com/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/view) - For observing your CDC pipeline with distributed tracing.
