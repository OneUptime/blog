# How to Configure PostgreSQL Logical Replication

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: PostgreSQL, Logical Replication, CDC, Database, Migration, Data Integration

Description: A comprehensive guide to setting up PostgreSQL logical replication for selective table replication, cross-version upgrades, change data capture, and multi-directional data flow.

---

Logical replication replicates data changes at the logical level (rows) rather than physical level (blocks). This enables selective replication, cross-version compatibility, and integration patterns impossible with streaming replication. This guide covers complete setup and use cases.

## Prerequisites

- PostgreSQL 10+ (logical replication support)
- Network connectivity between servers
- Superuser access for initial setup

## Logical vs Physical Replication

| Feature | Logical | Physical (Streaming) |
|---------|---------|---------------------|
| Granularity | Table-level | Entire cluster |
| Cross-version | Yes | No |
| DDL replication | No | Yes |
| Schema differences | Allowed | No |
| Write to replica | Yes | No |
| Performance | Lower | Higher |

## Basic Setup

### Publisher Configuration

On the source (publisher) server:

```conf
# postgresql.conf
wal_level = logical                  # Required for logical replication
max_wal_senders = 10                 # Max replication connections
max_replication_slots = 10           # Max replication slots
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Create Publication

```sql
-- Create publication for specific tables
CREATE PUBLICATION my_publication FOR TABLE users, orders, products;

-- Create publication for all tables
CREATE PUBLICATION all_tables FOR ALL TABLES;

-- Publication with specific operations
CREATE PUBLICATION insert_only FOR TABLE events
    WITH (publish = 'insert');  -- Only replicate INSERTs

-- Publication for schema
CREATE PUBLICATION schema_pub FOR TABLES IN SCHEMA public;
```

### Create Replication User

```sql
CREATE USER replication_user WITH REPLICATION PASSWORD 'secure_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO replication_user;
GRANT USAGE ON SCHEMA public TO replication_user;
```

### Configure pg_hba.conf

```conf
# Allow replication connections
host    all             replication_user    10.0.0.0/8    scram-sha-256
```

### Subscriber Configuration

On the target (subscriber) server:

```conf
# postgresql.conf
max_replication_slots = 10
max_logical_replication_workers = 4
max_worker_processes = 10
```

### Create Tables on Subscriber

```sql
-- Tables must exist with compatible schema
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(255),
    created_at TIMESTAMP
);

CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT,
    total DECIMAL(10,2),
    created_at TIMESTAMP
);
```

### Create Subscription

```sql
-- Create subscription
CREATE SUBSCRIPTION my_subscription
    CONNECTION 'host=publisher.example.com port=5432 dbname=myapp user=replication_user password=secure_password'
    PUBLICATION my_publication;

-- Subscription with options
CREATE SUBSCRIPTION my_subscription
    CONNECTION 'host=publisher.example.com port=5432 dbname=myapp user=replication_user password=secure_password'
    PUBLICATION my_publication
    WITH (
        copy_data = true,           -- Copy existing data
        create_slot = true,         -- Create replication slot
        enabled = true,             -- Start immediately
        synchronous_commit = off,   -- Async commit on subscriber
        slot_name = 'my_slot'       -- Custom slot name
    );
```

## Managing Publications

### Add Tables to Publication

```sql
-- Add table
ALTER PUBLICATION my_publication ADD TABLE new_table;

-- Remove table
ALTER PUBLICATION my_publication DROP TABLE old_table;

-- Set tables (replace all)
ALTER PUBLICATION my_publication SET TABLE users, orders;
```

### View Publication Details

```sql
-- List publications
SELECT * FROM pg_publication;

-- List tables in publication
SELECT * FROM pg_publication_tables WHERE pubname = 'my_publication';

-- Publication statistics
SELECT * FROM pg_stat_publication;
```

## Managing Subscriptions

### Subscription Control

```sql
-- Disable subscription
ALTER SUBSCRIPTION my_subscription DISABLE;

-- Enable subscription
ALTER SUBSCRIPTION my_subscription ENABLE;

-- Refresh subscription (after adding tables)
ALTER SUBSCRIPTION my_subscription REFRESH PUBLICATION;

-- Refresh with copy option
ALTER SUBSCRIPTION my_subscription REFRESH PUBLICATION WITH (copy_data = true);

-- Change connection
ALTER SUBSCRIPTION my_subscription
    CONNECTION 'host=new-publisher.example.com port=5432 dbname=myapp user=replication_user password=secure_password';
```

### View Subscription Details

```sql
-- List subscriptions
SELECT * FROM pg_subscription;

-- Subscription status
SELECT * FROM pg_stat_subscription;

-- Replication slot status (on publisher)
SELECT * FROM pg_replication_slots WHERE slot_type = 'logical';
```

### Drop Subscription

```sql
-- Disable first
ALTER SUBSCRIPTION my_subscription DISABLE;

-- Drop subscription
DROP SUBSCRIPTION my_subscription;
```

## Replication Conflict Handling

### Conflict Types

1. **INSERT conflict**: Row with same PK already exists
2. **UPDATE conflict**: Row doesn't exist or was modified
3. **DELETE conflict**: Row doesn't exist

### Handling Strategies

```sql
-- On subscriber: Skip conflicting transactions
-- In subscription error log, find conflicting LSN
SELECT pg_replication_origin_advance('pg_16384', 'A/B123456'::pg_lsn);

-- Or use triggers for custom handling
CREATE OR REPLACE FUNCTION handle_replication_conflict()
RETURNS TRIGGER AS $$
BEGIN
    -- Custom conflict resolution logic
    IF TG_OP = 'INSERT' THEN
        UPDATE users SET name = NEW.name, email = NEW.email
        WHERE id = NEW.id;
        RETURN NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Use Cases

### Cross-Version Upgrade

```sql
-- On old server (PostgreSQL 15)
CREATE PUBLICATION upgrade_pub FOR ALL TABLES;

-- On new server (PostgreSQL 16)
CREATE SUBSCRIPTION upgrade_sub
    CONNECTION 'host=old-server dbname=myapp user=replication_user password=xxx'
    PUBLICATION upgrade_pub
    WITH (copy_data = true);

-- Wait for sync, then switch applications
```

### Selective Table Replication

```sql
-- Replicate only needed tables to analytics server
CREATE PUBLICATION analytics_pub FOR TABLE
    orders,
    order_items,
    products,
    customers;
```

### Real-Time Data Integration

```sql
-- Replicate to data warehouse
CREATE PUBLICATION warehouse_pub FOR ALL TABLES;

-- On warehouse server
CREATE SUBSCRIPTION warehouse_sub
    CONNECTION 'host=production dbname=app ...'
    PUBLICATION warehouse_pub;
```

### Bi-Directional Replication

```sql
-- Server A
CREATE PUBLICATION pub_a FOR TABLE shared_data;
CREATE SUBSCRIPTION sub_from_b
    CONNECTION 'host=server-b ...'
    PUBLICATION pub_b
    WITH (origin = none);  -- Prevent loops

-- Server B
CREATE PUBLICATION pub_b FOR TABLE shared_data;
CREATE SUBSCRIPTION sub_from_a
    CONNECTION 'host=server-a ...'
    PUBLICATION pub_a
    WITH (origin = none);  -- Prevent loops
```

## Monitoring

### Check Replication Status

```sql
-- On publisher
SELECT
    slot_name,
    plugin,
    slot_type,
    database,
    active,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots
WHERE slot_type = 'logical';

-- On subscriber
SELECT
    subname,
    pid,
    relname,
    received_lsn,
    last_msg_send_time,
    last_msg_receipt_time
FROM pg_stat_subscription
JOIN pg_subscription_rel ON pg_stat_subscription.subid = pg_subscription_rel.srsubid;
```

### Lag Monitoring

```sql
-- Replication lag on publisher
SELECT
    slot_name,
    confirmed_flush_lsn,
    pg_current_wal_lsn() AS current_lsn,
    pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS lag
FROM pg_replication_slots
WHERE slot_type = 'logical';
```

## Troubleshooting

### Subscription Not Starting

```sql
-- Check subscription status
SELECT * FROM pg_stat_subscription;

-- Check for errors in logs
-- /var/log/postgresql/postgresql-16-main.log

-- Verify connection
psql "host=publisher dbname=myapp user=replication_user"
```

### Tables Out of Sync

```sql
-- Drop and recreate subscription
ALTER SUBSCRIPTION my_subscription DISABLE;
DROP SUBSCRIPTION my_subscription;

-- Truncate target tables
TRUNCATE users, orders CASCADE;

-- Recreate subscription
CREATE SUBSCRIPTION my_subscription
    CONNECTION '...'
    PUBLICATION my_publication
    WITH (copy_data = true);
```

### Replication Slot Growing

```sql
-- Check slot lag
SELECT slot_name, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS lag
FROM pg_replication_slots;

-- If subscriber is gone, drop slot
SELECT pg_drop_replication_slot('my_slot');
```

## Best Practices

1. **Test thoroughly** before production use
2. **Monitor lag** and slot size
3. **Handle conflicts** with proper strategy
4. **Plan for DDL changes** - not replicated automatically
5. **Use separate user** for replication
6. **Document dependencies** between tables

## Conclusion

Logical replication enables powerful data integration patterns:

1. **Selective replication** of specific tables
2. **Cross-version migration** with minimal downtime
3. **Data integration** with analytics systems
4. **Schema flexibility** between publisher and subscriber
5. **Bi-directional sync** for distributed systems

While more complex than streaming replication, logical replication's flexibility makes it invaluable for modern data architectures.
