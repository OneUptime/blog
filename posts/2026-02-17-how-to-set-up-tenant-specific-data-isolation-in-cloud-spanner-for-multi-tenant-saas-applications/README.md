# How to Set Up Tenant-Specific Data Isolation in Cloud Spanner for Multi-Tenant SaaS Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Spanner, Multi-Tenancy, Data Isolation, SaaS

Description: A practical guide to implementing tenant-specific data isolation in Google Cloud Spanner for multi-tenant SaaS applications with scalable schema design.

---

Cloud Spanner is one of the few databases that can give you both global consistency and horizontal scalability. That makes it an attractive choice for multi-tenant SaaS applications that need to serve customers across regions. But getting the schema right for multi-tenancy in Spanner requires some thought, because Spanner's distributed nature means your data model directly affects performance.

In this post, I will walk through the practical steps of setting up tenant-isolated data in Cloud Spanner, covering schema design, access patterns, and the Spanner-specific techniques that make multi-tenancy work well.

## Why Cloud Spanner for Multi-Tenant SaaS?

Before diving in, let me explain why Spanner is worth the complexity. Traditional relational databases like PostgreSQL work fine for multi-tenancy, but they hit scaling limits. When you have thousands of tenants generating heavy write loads, a single PostgreSQL instance cannot keep up. You end up sharding manually, which is painful.

Spanner handles sharding automatically. It distributes data across nodes based on the primary key, and it does this transparently. For multi-tenant applications, this means you can add tenants without worrying about manual sharding strategies.

## Schema Design: The Interleaved Table Pattern

The most important Spanner-specific concept for multi-tenancy is interleaved tables. Interleaving tells Spanner to physically co-locate child rows with their parent row. For multi-tenant applications, this means all of a tenant's data can be stored together on the same splits, which dramatically improves query performance.

```sql
-- Parent table: each row represents a tenant
-- The TenantId is the root of the interleaving hierarchy
CREATE TABLE Tenants (
    TenantId     STRING(36) NOT NULL,
    TenantName   STRING(256) NOT NULL,
    Tier         STRING(64) NOT NULL,
    CreatedAt    TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
    Settings     JSON,
) PRIMARY KEY (TenantId);

-- Orders table interleaved in Tenants
-- This physically co-locates orders with their tenant
CREATE TABLE Orders (
    TenantId     STRING(36) NOT NULL,
    OrderId      STRING(36) NOT NULL,
    CustomerName STRING(256) NOT NULL,
    TotalAmount  FLOAT64 NOT NULL,
    Status       STRING(64) NOT NULL,
    CreatedAt    TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (TenantId, OrderId),
  INTERLEAVE IN PARENT Tenants ON DELETE CASCADE;

-- Order items interleaved in Orders (which is itself interleaved in Tenants)
CREATE TABLE OrderItems (
    TenantId     STRING(36) NOT NULL,
    OrderId      STRING(36) NOT NULL,
    ItemId       STRING(36) NOT NULL,
    ProductName  STRING(256) NOT NULL,
    Quantity     INT64 NOT NULL,
    UnitPrice    FLOAT64 NOT NULL,
) PRIMARY KEY (TenantId, OrderId, ItemId),
  INTERLEAVE IN PARENT Orders ON DELETE CASCADE;

-- Create an index scoped to tenant for efficient lookups
CREATE INDEX OrdersByTenantAndDate
    ON Orders (TenantId, CreatedAt DESC);

CREATE INDEX OrdersByTenantAndStatus
    ON Orders (TenantId, Status);
```

The key insight here is that TenantId is always the first part of the primary key. This ensures that all data for a single tenant is stored in the same Spanner splits, making tenant-scoped queries fast and efficient.

## Implementing Data Access with Tenant Isolation

Your application layer must enforce that every query is scoped to the correct tenant. Here is a data access layer in Python that handles this.

```python
# data_access/spanner_client.py
from google.cloud import spanner

class TenantScopedSpannerClient:
    """Provides tenant-isolated access to Cloud Spanner."""

    def __init__(self, instance_id, database_id):
        self.client = spanner.Client()
        self.instance = self.client.instance(instance_id)
        self.database = self.instance.database(database_id)

    def get_orders(self, tenant_id, limit=100):
        """Fetch orders for a specific tenant.
        The query is always scoped by tenant_id."""
        with self.database.snapshot() as snapshot:
            # Spanner will efficiently route this query because
            # TenantId is the first part of the primary key
            results = snapshot.execute_sql(
                "SELECT OrderId, CustomerName, TotalAmount, Status, CreatedAt "
                "FROM Orders "
                "WHERE TenantId = @tenant_id "
                "ORDER BY CreatedAt DESC "
                "LIMIT @limit",
                params={"tenant_id": tenant_id, "limit": limit},
                param_types={
                    "tenant_id": spanner.param_types.STRING,
                    "limit": spanner.param_types.INT64,
                },
            )
            return [dict(zip(
                ["order_id", "customer_name", "total_amount", "status", "created_at"],
                row
            )) for row in results]

    def create_order(self, tenant_id, order_data):
        """Create an order for a specific tenant using a mutation."""
        import uuid

        order_id = str(uuid.uuid4())

        def insert_order(transaction):
            # Insert the order
            transaction.insert(
                table="Orders",
                columns=["TenantId", "OrderId", "CustomerName",
                         "TotalAmount", "Status", "CreatedAt"],
                values=[(
                    tenant_id,
                    order_id,
                    order_data["customer_name"],
                    order_data["total_amount"],
                    "pending",
                    spanner.COMMIT_TIMESTAMP,
                )]
            )

            # Insert order items
            if "items" in order_data:
                item_values = []
                for item in order_data["items"]:
                    item_values.append((
                        tenant_id,
                        order_id,
                        str(uuid.uuid4()),
                        item["product_name"],
                        item["quantity"],
                        item["unit_price"],
                    ))

                transaction.insert(
                    table="OrderItems",
                    columns=["TenantId", "OrderId", "ItemId",
                             "ProductName", "Quantity", "UnitPrice"],
                    values=item_values,
                )

        # Run the transaction
        self.database.run_in_transaction(insert_order)
        return order_id
```

## Handling Hot Spots

One challenge with tenant-scoped data in Spanner is hot spots. If a large tenant generates heavy write traffic, the splits holding that tenant's data can become overloaded. There are several strategies to handle this.

```sql
-- Use a ShardId to distribute writes across splits for large tenants
-- The ShardId is a hash of the TenantId and a timestamp component
CREATE TABLE HighVolumeEvents (
    TenantId     STRING(36) NOT NULL,
    ShardId      INT64 NOT NULL,
    EventId      STRING(36) NOT NULL,
    EventType    STRING(128) NOT NULL,
    Payload      JSON,
    CreatedAt    TIMESTAMP NOT NULL OPTIONS (allow_commit_timestamp=true),
) PRIMARY KEY (TenantId, ShardId, EventId),
  INTERLEAVE IN PARENT Tenants ON DELETE CASCADE;
```

```python
# Generate a shard ID that distributes writes for high-volume tenants
import hashlib
import time

def get_shard_id(tenant_id, num_shards=10):
    """Generate a shard ID to distribute writes across splits.
    Uses a combination of tenant ID and current time to spread load."""
    current_second = int(time.time())
    shard_input = f"{tenant_id}:{current_second}"
    hash_value = int(hashlib.md5(shard_input.encode()).hexdigest(), 16)
    return hash_value % num_shards
```

## Per-Tenant Read Replicas

For tenants with read-heavy workloads, you can configure Spanner to use stale reads, which can be served from any replica and are cheaper.

```python
def get_tenant_analytics(self, tenant_id, days=30):
    """Fetch analytics data using a stale read for better performance.
    Stale reads can be served from any replica, reducing latency."""
    import datetime

    staleness = datetime.timedelta(seconds=15)

    with self.database.snapshot(exact_staleness=staleness) as snapshot:
        results = snapshot.execute_sql(
            "SELECT DATE(CreatedAt) as order_date, "
            "       COUNT(*) as order_count, "
            "       SUM(TotalAmount) as revenue "
            "FROM Orders "
            "WHERE TenantId = @tenant_id "
            "  AND CreatedAt > TIMESTAMP_SUB(CURRENT_TIMESTAMP(), "
            "                                INTERVAL @days DAY) "
            "GROUP BY order_date "
            "ORDER BY order_date DESC",
            params={"tenant_id": tenant_id, "days": days},
            param_types={
                "tenant_id": spanner.param_types.STRING,
                "days": spanner.param_types.INT64,
            },
        )
        return list(results)
```

## Fine-Grained Access Control

Spanner supports fine-grained access control (FGAC) through database roles. You can create roles that restrict access to specific tables or even rows.

```sql
-- Create a database role for tenant data access
CREATE ROLE tenant_reader;

-- Grant read access only to tenant-specific tables
GRANT SELECT ON TABLE Orders TO ROLE tenant_reader;
GRANT SELECT ON TABLE OrderItems TO ROLE tenant_reader;

-- Create a role for the application service
CREATE ROLE app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE Orders TO ROLE app_service;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE OrderItems TO ROLE app_service;
```

## Monitoring Spanner for Multi-Tenant Workloads

Keep an eye on per-tenant query performance using Spanner's query statistics tables.

```sql
-- Find the slowest queries per tenant in the last hour
-- Useful for identifying tenants with problematic query patterns
SELECT
    text AS query_text,
    execution_count,
    avg_latency_seconds,
    avg_rows_scanned,
    avg_cpu_seconds
FROM
    SPANNER_SYS.QUERY_STATS_TOP_HOUR
WHERE
    text LIKE '%TenantId%'
ORDER BY
    avg_latency_seconds DESC
LIMIT 20;
```

## Wrapping Up

Cloud Spanner is an excellent choice for multi-tenant SaaS applications that need global scale. The key to making it work well is using interleaved tables with TenantId as the root of your primary key hierarchy. This ensures data locality for tenant-scoped queries and lets Spanner automatically distribute the load across nodes. Combine this with proper access controls, hot spot mitigation, and tenant-aware monitoring, and you have a solid foundation for a scalable multi-tenant data layer.
