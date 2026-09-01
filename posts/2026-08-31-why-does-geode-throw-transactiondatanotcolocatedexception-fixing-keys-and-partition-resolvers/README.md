# Why Does Geode Throw `TransactionDataNotColocatedException`? Fixing Keys and Partition Resolvers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Java, Troubleshooting, Partitioning, Distributed Database

Description: Fix Geode transactions that span incompatible data hosts by aligning atomic boundaries, region colocation, keys, and partition-resolver routing objects.

---

Apache Geode throws `TransactionDataNotColocatedException` when a hosted transaction tries to modify data that is not colocated on the transaction's data host. A hosted transaction involving a partitioned region is anchored to a data host by its first region operation, so in a mixed partitioned-and-replicated transaction that first operation must be on a partitioned region. Later transactional operations must be executable on that same host.

This is a data-model error more often than a transient network error. Adding a locator, raising a timeout, or increasing redundant copies does not make unrelated primary data transactional on one member.

## Identify Which Operation Crossed the Boundary

Log the transaction's region paths, keys, and intended routing identity before `begin`, but do not log sensitive values. Keep the complete exception chain: a client can receive the server-side transaction failure inside a connectivity or operation wrapper.

The usual causes are:

- two keys in one partitioned region hash to buckets on different hosts;
- related keys use different routing objects even though a business identifier matches;
- two partitioned regions are not configured with `colocated-with`;
- colocated regions use inconsistent keys or partition resolvers;
- a transaction mixing partitioned and replicated regions touches the replicated region first; or
- recovery or rebalance moves data while the transaction is in progress.

The exception may occur during a region operation or at commit. Do not assume that every statement before `commit()` has therefore succeeded durably.

## Align the Transaction with a Routing Key

Suppose one transaction updates a customer and one of that customer's orders. These keys look related to a person but do not naturally hash the same way:

```text
Customer key: customer-42
Order key:    order-9001
```

Make the shared customer identity the routing object. Geode includes `StringPrefixPartitionResolver`, which returns the part of a string key before the first `|` delimiter. A compatible key design is:

```text
customer-42|profile
customer-42|order-9001
```

Configure the same resolver and bucket-management settings on related regions, and colocate the dependent region:

```text
gfsh> create region \
  --name=Customers \
  --type=PARTITION \
  --redundant-copies=1 \
  --total-num-buckets=113 \
  --partition-resolver=org.apache.geode.cache.util.StringPrefixPartitionResolver

gfsh> create region \
  --name=Orders \
  --type=PARTITION \
  --redundant-copies=1 \
  --total-num-buckets=113 \
  --partition-resolver=org.apache.geode.cache.util.StringPrefixPartitionResolver \
  --colocated-with=Customers
```

Now both keys return `customer-42`, so they map to the same bucket ID; colocation keeps the corresponding buckets from the two regions together.

Prefix routing is appropriate only when the delimiter and key grammar are enforced. An accidental key without `|` causes `StringPrefixPartitionResolver` to reject the operation. Use typed key objects and a custom `PartitionResolver` when strings would let invalid keys enter the system.

## Implement a Safe Custom Resolver

A resolver should derive routing solely from immutable key fields:

```java
public final class TenantResolver
    implements PartitionResolver<Object, Object> {

  @Override
  public Object getRoutingObject(EntryOperation<Object, Object> operation) {
    Object key = operation.getKey();
    if (key instanceof TenantRouted routed) {
      return routed.tenantId();
    }
    throw new IllegalArgumentException("Unsupported key type: " + key.getClass());
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
```

Deploy the resolver JAR to every member that defines the region, including accessors, before region creation and configure the identical implementation everywhere. Geode checks resolver compatibility across members. For client single-hop routing, package the stateless, zero-argument resolver in the client application as well. The routing object's `equals` and `hashCode` must remain stable across JVMs and serialization.

Do not route from the value. Updating a value field could otherwise imply a different bucket while the entry's key remains unchanged. Do not return random, time-dependent, or process-local objects. A resolver that returns a constant can avoid same-region cross-bucket failures by placing all data in one bucket, but it does not fix missing cross-region colocation or topology movement and creates a severe throughput and capacity hotspot.

## Keep All Operations on One Business Aggregate

With compatible routing, the transaction can stay inside one customer's aggregate:

```java
CacheTransactionManager tx = cache.getCacheTransactionManager();

try {
  tx.begin();
  customers.put("customer-42|profile", customer);
  orders.put("customer-42|order-9001", order);
  tx.commit();
} catch (RuntimeException failure) {
  if (tx.exists()) {
    tx.rollback();
  }
  throw failure;
}
```

Adding `customer-99|order-8100` to that transaction crosses the intentional routing boundary. Split independent aggregates into separate transactions, store an atomic aggregate in one entry, or redesign the workflow around idempotent events and compensation. Geode transactions are not an arbitrary cross-cluster two-phase commit facility.

When both replicated and partitioned regions participate, Geode's official design guidance requires the first operation to be on the partitioned region. That establishes the appropriate transactional host before replicated-region work is added.

Persistent regions are a separate limitation: Geode rejects their operations inside atomic transactions by default. `-Dgemfire.ALLOW_PERSISTENT_TRANSACTIONS=true` removes that guard, but a crash during commit can leave only some disk writes applied. Do not treat that opt-in as crash-atomic persistence.

## Account for Rebalance and Recovery

Even correctly routed transactions can race a topology change. The `TransactionDataNotColocatedException` Java API notes that data movement between operations and commit can produce the exception; Geode also defines transaction exceptions specifically for rebalanced data.

Schedule large rebalances away from critical transaction windows where possible and keep transactions short. A retry may be appropriate only after confirming the transaction did not commit and making the whole business operation idempotent. Never blindly retry `TransactionInDoubtException`, because its meaning is that the client cannot know which participants applied the commit.

Redundant copies improve availability but do not let a transaction choose unrelated primaries spread across members. The transaction still needs one coherent routing and colocation design.

## Verify the Fix Under Movement

Test more than one pair of sample keys:

1. Assert that all key types for one business ID return equal routing objects.
2. Assert that different business IDs distribute across many buckets rather than one.
3. Use `describe region` to confirm the dependent region's colocation and compare its reported non-default partition attributes; verify omitted settings against their documented defaults.
4. Commit same-customer cross-region transactions repeatedly.
5. Reject a deliberately cross-customer transaction in application code; unrelated buckets can temporarily share a host, so Geode failure is not a stable boundary check.
6. Repeat the valid case after a controlled rebalance and member restart.

If an existing region was created with the wrong resolver, treat the correction as a data migration. Create new correctly configured regions, copy the data and transform keys if the key scheme changes, verify counts and behavior, switch clients, and retire the old regions. Partitioning attributes are not a safe in-place rewrite of already distributed data.

## Official Documentation

- [`TransactionDataNotColocatedException` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/TransactionDataNotColocatedException.html)
- [Transaction design considerations](https://geode.apache.org/docs/guide/latest/developing/transactions/design_considerations.html)
- [Colocating partitioned-region data](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/colocating_partitioned_region_data.html)
- [Using custom partition resolvers](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/using_custom_partition_resolvers.html)
- [`PartitionResolver` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/PartitionResolver.html)
- [`StringPrefixPartitionResolver` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/util/StringPrefixPartitionResolver.html)

## Conclusion

Fix `TransactionDataNotColocatedException` at the routing boundary: one atomic aggregate should produce one stable routing object, and related partitioned regions must share bucket settings, resolvers, and colocation. Keep transactions short, touch a partitioned region first in mixed transactions, and treat rebalance-time failures with explicit idempotency rather than automatic retries.
