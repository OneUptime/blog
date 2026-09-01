# Speed Up Apache Geode OQL Joins with Colocation, Keys, and Indexes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Query Optimization, Performance, Partitioning, Java

Description: Replace cluster-wide Geode join work with colocated routing, selective indexes, bind parameters, and a function-scoped equi-join on local partitioned data.

---

A slow Apache Geode OQL join is often a data-placement problem before it is an indexing problem. Normal client/server joins involving partitioned regions are not supported. Geode's supported pattern is an **equi-join over colocated partitioned regions executed inside a region function with `Query.execute(RegionFunctionContext)`**.

Indexes can reduce comparisons within that local data, but they cannot remove network movement caused by unrelated partitions or make an unsupported distributed join valid. Optimize in this order: keys, colocation, function routing, query shape, then indexes.

## Start with the Access Path, Not the Query Text

Assume `/Customers` and `/Orders` are partitioned by `customerId`. A request asks for one customer's qualifying orders and customer record. If the application already knows exact order keys, `getAll` is cheaper and simpler than a join. Use OQL when the qualifying order keys are not known and a predicate must select them.

The intended invariant is:

```text
CustomerId("customer-42") and every OrderKey("customer-42", ...)
produce routing object "customer-42".
```

Configure a shared `PartitionResolver`, create `/Customers` first, and create `/Orders` with `colocated-with=Customers`. Both regions must use equal values for `total-num-buckets`, `redundant-copies`, `recovery-delay`, and `startup-recovery-delay`. Colocation keeps matching bucket IDs on the same members; the resolver makes related entries select matching bucket IDs.

When Java clients use single-hop routing with a custom resolver, include that resolver on the client classpath as a stateless class with a zero-argument constructor. Deploying it only to servers is not enough for client-side single-hop routing.

Without both pieces, a field called `customerId` in each value is only a logical relationship. It says nothing about physical placement.

## Use an Equi-Join That Includes the Routing Columns

Geode supports partitioned-region equi-joins only when the colocated columns actually appear in the `WHERE` clause. Make that relationship explicit and add a selective bind parameter:

```sql
SELECT DISTINCT o.orderId, o.total, c.tier
FROM /Orders o, /Customers c
WHERE o.customerId = c.customerId
  AND c.customerId = $1
  AND o.status = $2
```

Project only fields the caller needs. Returning two complete object graphs for every row increases serialization, network traffic, and collector memory. Use bind parameters instead of concatenating values into OQL. They keep runtime values separate from the query text and avoid quoting mistakes; a retained, thread-safe `Query` object can also be built once and executed repeatedly with different parameter values.

This is an equality join. Colocation does not enable arbitrary theta joins, cross products, or a join whose equality field differs from the routing field. Multi-column partitioning requires all relevant colocation columns in the equality conditions, joined with the required `AND` logic.

## Execute the Query in a Region Function

Deploy and register a function on every server that may host the partitioned regions. Its core logic should receive a `RegionFunctionContext` and pass that exact context to the query:

```java
public final class CustomerOrderJoin implements Function<String> {
  public static final String ID = "customer-order-join-v1";

  @Override
  public void execute(FunctionContext<String> context) {
    if (!(context instanceof RegionFunctionContext regionContext)) {
      throw new IllegalArgumentException("Region execution is required");
    }

    String oql = """
        SELECT DISTINCT o.orderId, o.total, c.tier
        FROM /Orders o, /Customers c
        WHERE o.customerId = c.customerId
          AND c.customerId = $1
          AND o.status = $2
        """;

    Query query = context.getCache().getQueryService().newQuery(oql);
    Object[] parameters = {context.getArguments(), "OPEN"};

    try {
      SelectResults<?> rows =
          (SelectResults<?>) query.execute(regionContext, parameters);
      context.getResultSender().lastResult(new ArrayList<>(rows));
    } catch (Exception failure) {
      throw new FunctionException("Customer order query failed", failure);
    }
  }

  @Override
  public String getId() {
    return ID;
  }

  @Override
  public boolean hasResult() {
    return true;
  }
}
```

The decisive call is `query.execute(regionContext, parameters)`, not plain `query.execute(parameters)`. The context associates execution with the local partitioned data selected by function routing and permits the supported colocated join.

The example keeps the status constant to show the mechanics; pass a small typed argument object when several values vary. Also override `getRequiredPermissions` for a production read-only function so it explicitly requires `DATA:READ` on both `/Customers` and `/Orders`. The `Function` API's default permission is write-oriented and is too broad and surprising for a query function.

From a client, route the function with an existing `/Customers` key:

```java
ResultCollector<?, ?> collector = FunctionService.onRegion(customers)
    .withFilter(Set.of(new CustomerId("customer-42")))
    .setArguments("customer-42")
    .execute(CustomerOrderJoin.ID);

List<?> resultFragments = (List<?>) collector.getResult();
```

The filter selects the bucket and members on which the function runs. The result collector returns per-execution result fragments, so flatten and type-check them in application code. Without a filter, a partitioned-region function can execute across all data hosts, turning a single-customer request back into cluster-wide work.

## Add Indexes That Match the Real Query

Create indexes on the data-store members that host buckets for the regions. Building them before bulk loading adds index-maintenance work to the load; building them afterward populates them from existing data, so measure the trade-off. For a partitioned region, a programmatic `QueryService.createIndex` call distributes index creation to the region's data stores, but it does not persist cluster configuration. Invoke the programmatic definitions once after the regions exist, or use `gfsh create index` without a `--members` target to create the indexes and, when the region is managed by the enabled cluster configuration service, persist their definitions for future starts. Programmatic definitions let each single-region index use the corresponding iterator form from the query:

```java
QueryService queryService = cache.getQueryService();

queryService.createIndex(
    "ordersByCustomer", "o.customerId", "/Orders o");

queryService.createIndex(
    "openOrdersByStatus", "o.status", "/Orders o");

queryService.createIndex(
    "customersById", "c.customerId", "/Customers c");
```

Do not create every possible index. Each index consumes memory and is maintained on writes. Start with selective fields used by frequent queries and measure the write penalty. For this equi-join, use regular range indexes on both sides of the join; key indexes are not applied to equi-join queries. For separate single-region queries, consider a key index only when the indexed expression evaluates to the actual region key and the predicate uses equality; a routing field alone is not sufficient. Otherwise use a range index. Hash indexes are deprecated in current Geode APIs.

Geode's general index guidance says the query and index `FROM` clauses should match exactly when possible. Equi-joins are the documented case where you create one regular single-region index for each side, as above. Iterator structure, nested collections, and expression shape matter. An index existing in `gfsh list indexes` does not prove that a differently shaped query can use it.

For several indexes on a populated region, the `QueryService.defineIndex` and `createDefinedIndexes` workflow avoids separate full-region iterations for each build. Build indexes with capacity headroom; index creation over a large live region consumes CPU and memory.

## Prove the Index and Routing Are Used

Prefix a test query with `<TRACE>`:

```sql
<TRACE> SELECT DISTINCT o.orderId, o.total, c.tier
FROM /Orders o, /Customers c
WHERE o.customerId = c.customerId
  AND c.customerId = $1
  AND o.status = $2
```

Geode writes query execution time, row count, and indexes used to the server log. Compare traces before and after each index with the same data, parameters, and warm-up. Also record how many members executed the function and the returned bytes. A fast local scan on one small bucket may outperform several maintained indexes.

Check the complete performance budget:

- resolver distribution and bucket sizes;
- function fan-out and filter selectivity;
- index lookup time and write maintenance;
- rows scanned and projected;
- result serialization and client collection; and
- retry or duplicate execution for high-availability functions.

If the function can be re-executed, honor `FunctionContext.isPossibleDuplicate()` and keep any side effects idempotent. A pure read function is easier to make safe.

## Recognize Designs an Index Cannot Rescue

An index cannot fix a resolver that sends half the workload to one customer or tenant bucket. A rebalance moves whole buckets and cannot split that hot routing object. Likewise, a large unbounded result can still exhaust the function member or client even if indexes locate it quickly.

For broad analytics across many customers, consider a separate query-oriented region, precomputed projection, or analytical system rather than sending one OLTP join function to every Geode data host. Optimize for the actual consistency and freshness requirement instead of forcing every workload through the transactional layout.

## Official Documentation

- [Performing an equi-join query on partitioned regions](https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/join_query_partitioned_regions.html)
- [Partitioned-region query restrictions](https://geode.apache.org/docs/guide/latest/developing/query_additional/partitioned_region_query_restrictions.html)
- [Optimizing queries on partitioned keys or fields](https://geode.apache.org/docs/guide/latest/developing/query_additional/partitioned_region_key_or_field_value.html)
- [Working with indexes](https://geode.apache.org/docs/guide/latest/developing/query_index/query_index.html)
- [Indexing guidelines](https://geode.apache.org/docs/guide/latest/developing/query_index/indexing_guidelines.html)
- [`Query.execute(RegionFunctionContext)` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/Query.html)
- [`Function` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/execute/Function.html)
- [`FunctionService` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/execute/FunctionService.html)

## Conclusion

Make the join local before making it indexed: related keys must share a routing object, regions must be colocated, and a filtered function must call `Query.execute` with its `RegionFunctionContext`. Then use selective, matching indexes, small projections, bind parameters, and trace evidence to remove the remaining local query cost.
