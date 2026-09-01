# How to Colocate Apache Geode Partitioned Regions for Transactions and Join-Like Access

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Partitioning, Java, Performance, Distributed Database

Description: Place related entries from multiple Geode partitioned regions in matching buckets so one data host can execute transactions and supported equi-join functions.

---

Apache Geode colocation keeps buckets with the same ID from related partitioned regions on the same members. With Geode's default non-distributed transaction mode (`distributed-transactions=false`), colocation is required when a transaction modifies entries across partitioned regions. It also enables Geode's supported equi-join pattern through the context-aware `Query.execute(...)` overloads.

Setting `colocated-with` is only half the design. Related keys must also produce the same routing object. Two colocated regions can still place a customer's entries in different bucket IDs if their keys or partition resolvers route differently.

## Design One Routing Invariant

Suppose `/Customers` is keyed by `CustomerId` and `/Orders` is keyed by `OrderKey`. State the invariant before writing configuration:

```text
Every Customers and Orders entry for customer C returns routing object C.
```

Use a shared key contract and a stateless resolver:

```java
package com.acme.geode;

import java.io.Serializable;
import org.apache.geode.cache.EntryOperation;
import org.apache.geode.cache.PartitionResolver;

public final class CustomerPartitionResolver
    implements PartitionResolver<Object, Object>, Serializable {

  @Override
  public Object getRoutingObject(EntryOperation<Object, Object> operation) {
    Object key = operation.getKey();
    if (!(key instanceof CustomerRouted routed)) {
      throw new IllegalArgumentException("Key must implement CustomerRouted");
    }
    return routed.customerId();
  }

  @Override
  public String getName() {
    return getClass().getName();
  }

  @Override
  public void close() {}

  @Override
  public boolean equals(Object other) {
    return other != null && other.getClass() == getClass();
  }

  @Override
  public int hashCode() {
    return getClass().getName().hashCode();
  }
}

interface CustomerRouted {
  String customerId();
}

record CustomerId(String customerId)
    implements CustomerRouted, Serializable {}

record OrderKey(String customerId, String orderId)
    implements CustomerRouted, Serializable {}
```

The routing object must have stable `equals` and `hashCode` behavior. Build it only from immutable key fields. Geode's official guidance explicitly warns against routing from the value or other mutable metadata. The resolver itself also needs compatible equality behavior because members verify that they use the same resolver implementation.

## Create the Central Region First

Package and deploy the resolver before creating regions:

```text
gfsh> deploy --jars=/opt/geode/lib/customer-routing.jar
```

If Java clients use partitioned-region single-hop routing, put the same resolver class on their classpaths too. Geode's client guidance requires a custom resolver used for single hop to have a zero-argument constructor and no state; deploying a JAR to servers does not install it in client applications.

Create one central region with no `colocated-with` setting, then create dependent regions that name it:

```text
gfsh> create region \
  --name=Customers \
  --type=PARTITION \
  --redundant-copies=1 \
  --total-num-buckets=113 \
  --recovery-delay=0 \
  --startup-recovery-delay=0 \
  --partition-resolver=com.acme.geode.CustomerPartitionResolver

gfsh> create region \
  --name=Orders \
  --type=PARTITION \
  --redundant-copies=1 \
  --total-num-buckets=113 \
  --recovery-delay=0 \
  --startup-recovery-delay=0 \
  --partition-resolver=com.acme.geode.CustomerPartitionResolver \
  --colocated-with=Customers
```

The central region must exist before a colocated child is created. Across the colocation group, keep `total-num-buckets`, `redundant-copies`, `recovery-delay`, and `startup-recovery-delay` the same. If any region in the group is persistent, Geode requires the central region to be persistent, and all persisted regions in the group must use the same disk store; plan startup order for the complete group.

That persistence rule does not make persistent regions transaction-safe. Geode rejects persistent-region operations in an atomic transaction by default. The opt-in `-Dgemfire.ALLOW_PERSISTENT_TRANSACTIONS=true` removes the rejection but does not make the commit's disk writes atomic, so do not use it where crash-atomic durability is required.

Point each dependent at the chosen central region. Do not try to retrofit a different colocation relationship after data is loaded. Treat routing and bucket count as schema: changing them requires a planned new-region migration.

## Run a Transaction on One Routing Object

With that default non-distributed mode, a transaction for one customer can modify both regions on one data host:

```java
CacheTransactionManager tx = cache.getCacheTransactionManager();
CustomerId customerKey = new CustomerId("customer-42");
OrderKey orderKey = new OrderKey("customer-42", "order-9001");

try {
  tx.begin();
  customers.put(customerKey, updatedCustomer);
  orders.put(orderKey, newOrder);
  tx.commit();
} catch (RuntimeException failure) {
  if (tx.exists()) {
    tx.rollback();
  }
  throw failure;
}
```

Colocation guarantees that corresponding bucket IDs stay together; it does not guarantee that different routing objects and bucket IDs share a host. In the default non-distributed mode, a second order for `customer-99` may live on another host, so modifying it in the same transaction can raise `TransactionDataNotColocatedException`. Different buckets can happen to share a host under one placement and separate after a rebalance, so keep the atomic boundary aligned with one routing object rather than relying on current placement.

For a default non-distributed transaction mixing replicated and partitioned regions, Geode's transaction design guidance says the first operation must be on the partitioned region. Queries and indexes also do not expose uncommitted transactional state, so do not use a query inside the transaction as proof that a prior write is visible.

## Use the Supported Join-Like Pattern

Colocation alone does not enable arbitrary SQL-style joins from a client. Geode supports equi-joins involving partitioned regions when:

- the partitioned regions are colocated;
- the equality predicate includes the actual colocation columns;
- the query is executed inside a region function; and
- the function calls `Query.execute(RegionFunctionContext)` for an unparameterized query, or `Query.execute(RegionFunctionContext, Object[])` when the OQL has bind parameters.

For example, the server-side query can be:

```sql
SELECT DISTINCT o, c
FROM /Orders o, /Customers c
WHERE o.customerId = c.customerId
  AND o.customerId = $1
```

Invoke the function on `/Orders` with a filter containing an `OrderKey` whose routing object is the target customer. Pass the customer ID as a separate function argument, and inside the function call `query.execute(context, new Object[] {customerId})` to bind `$1`; the filter only routes and scopes execution. Geode routes execution to the relevant bucket host, and the function's `RegionFunctionContext` constrains the query to the local partitioned data and its colocated region. Calling `query.execute()` without that context is not the same operation and is unsupported for this partitioned-region join.

If the caller already knows exact region keys, prefer `get` or `getAll` over an OQL join. Colocation makes those related lookups local when code runs on the bucket host, which is often simpler and cheaper than constructing a result set.

## Validate Placement, Not Just Configuration Text

Start with management output:

```text
gfsh> describe region --name=/Customers
gfsh> describe region --name=/Orders
```

Then add an integration test that writes several key types for the same customer and executes a region function. On the server, `PartitionRegionHelper.getColocatedRegions(orders)` should include `/Customers`, while `PartitionRegionHelper.getLocalDataForContext(context)` exposes data local to that function execution. Test different customers too; a resolver that accidentally returns a constant will colocate everything but create one severe hot bucket.

Run the test after a rebalance and member restart. Geode moves colocated bucket groups together, so the invariant should survive topology changes. Avoid running rebalancing concurrently with important transactions because moving data can abort an in-flight transaction.

## Official Documentation

- [Colocate data from different partitioned regions](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/colocating_partitioned_region_data.html)
- [Custom-partitioning and data-colocation concepts](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/custom_partitioning_and_data_colocation.html)
- [Custom partition resolvers](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/using_custom_partition_resolvers.html)
- [Transaction design considerations](https://geode.apache.org/docs/guide/latest/developing/transactions/design_considerations.html)
- [Equi-join queries on partitioned regions](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/join_query_partitioned_regions.html)
- [`PartitionResolver` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/PartitionResolver.html)

## Conclusion

Choose one central region, give every related region identical bucket-management settings, and make all related key types return the same immutable routing object. That creates the single-host boundary required by Geode's default non-distributed cross-region transactions and by function-scoped equi-joins while preserving colocation through recovery and rebalance.
