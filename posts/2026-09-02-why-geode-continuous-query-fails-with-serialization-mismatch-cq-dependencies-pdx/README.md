# Why Geode Continuous Queries Fail with Serialization Mismatches

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Troubleshooting, Serialization, Querying, Java

Description: Isolate server evaluation, initial-result, and event-delivery serialization failures in Geode CQs, then repair classpaths or adopt a stable PDX contract.

---

A Geode continuous query (CQ) crosses several serialization boundaries. The client registers OQL, a server evaluates it against region values, an optional initial result set returns to the client, and later matching events pass through a subscription queue to the listener. A generic `CqException`, `SerializationException`, `ClassNotFoundException`, `PdxSerializationException`, or `TypeMismatchException` does not by itself identify which boundary failed.

Start by locating the phase:

| Failure point | Typical dependency |
| --- | --- |
| `newCq` fails | Legal CQ syntax and shape, a unique CQ name, valid arguments |
| `execute` fails | Region existence and type, pool and subscription connectivity, authentication and authorization |
| `executeWithInitialResults` fails | Everything above plus evaluation of current entries, result serialization, client deserialization, or a read timeout |
| CQ runs but listener `onError` fires | Serialization or query evaluation for a particular changed entry |
| `onEvent` throws | Client class/serializer or an unsafe listener cast |
| Only one server fails | JAR, PDX, region, index, or security configuration drift on that server |

That distinction prevents a common mistake: repeatedly changing the client's listener when the server cannot evaluate the stored value.

## Confirm That the Query Is a Legal CQ

A CQ is not an arbitrary OQL query. Current Geode CQ rules require a `SELECT` over one partitioned region, or one replicated region that does not use local-destroy eviction. The query cannot use cross-region joins, nested-collection drill-downs, `DISTINCT`, projections, bind parameters, `ORDER BY`, `GROUP BY`, or aggregate functions.

Use a minimal query first:

```sql
SELECT * FROM /orders o WHERE o.total >= 100.0
```

Do not use this ordinary-query shape as a CQ:

```sql
SELECT DISTINCT o.id, o.total
FROM /orders o
WHERE o.total >= $1
ORDER BY o.id
```

The client pool also needs subscriptions enabled:

```java
ClientCache client = new ClientCacheFactory()
    .addPoolLocator("locator.example.net", 10334)
    .setPoolSubscriptionEnabled(true)
    .setPoolSubscriptionRedundancy(1)
    .create();
```

If the error goes away with a primitive-valued test region and a legal minimal CQ, the subscription path works and the domain-value contract is the next target.

## Map Which Process Must Know Each Class

Geode sends client/server data in serialized form. A server can transfer a value without its class, but it needs classes for entry keys and for any value it must deserialize or access other than as `PdxInstance`. Persistent values can also require the value class during server recovery.

Check all of these processes, not just the registering client:

- every server that hosts `/orders` and can become the CQ's primary or redundant server;
- the client that consumes initial results and CQ events;
- any server function, cache listener, writer, loader, index expression, or method invocation that touches the value;
- every member configured with a custom `PdxSerializer`; and
- every producer capable of writing a value into the region.

For class-based serialization, deploy the same domain and serializer JAR to every relevant server:

```text
gfsh> deploy --jars=/opt/geode/app/order-model.jar
gfsh> list deployed
```

Alternatively, supply the JAR at process startup:

```text
gfsh> start server --name=server-1 \
  --classpath=/opt/geode/app/order-model.jar
```

`deploy` updates the targeted member classpaths and, when the cluster configuration service is enabled, persists the JAR in cluster configuration. An ad hoc local `CLASSPATH` can easily differ between servers. Restart or redeploy consistently after replacing a JAR; a single stale server can make a CQ fail only after failover.

## Do Not Mix Serialization Contracts Under One Region

A region can technically contain heterogeneous values, but a CQ predicate assumes every evaluated entry can support its field path and comparison. Typical mismatches include:

- one producer writes `total` as a PDX `DOUBLE`, another writes it as a string;
- an old object uses `amount`, while the CQ queries `total`;
- one client writes Java-serialized objects and another writes PDX under the same keys;
- different writers use different PDX class names for values that consumers expect to share one domain type, or their `PdxSerializer` implementations use different field names;
- the same PDX field changes from `INT` to `LONG`; or
- the server evaluates a domain method whose class is absent or blocked by the method invocation authorizer.

Inspect representative entries, including the entry whose update triggered `onError`. With PDX read-serialized enabled, log the type and fields without materializing a domain object:

```java
Object value = orders.get("order-1042");

if (value instanceof PdxInstance pdx) {
  System.out.println("type=" + pdx.getClassName());
  System.out.println("fields=" + pdx.getFieldNames());
  System.out.println("total=" + pdx.getField("total"));
} else if (value != null) {
  System.out.println("runtimeType=" + value.getClass().getName());
} else {
  System.out.println("value=<missing-or-invalid>");
}
```

Compare multiple writers and old data, not only a newly inserted happy-path record.

## Use PDX to Remove Unnecessary Server Class Dependencies

PDX lets the query engine access named fields without fully deserializing the value. With the cluster configuration service enabled, configure it before starting data servers:

```text
gfsh> configure pdx --read-serialized=true
```

`configure pdx` fails when the cluster configuration service is disabled; in that case configure each server through cache XML or the API. An already running server will not adopt a new `configure pdx` setting until restart. The equivalent embedded-server setting must be made before cache creation:

```java
Cache cache = new CacheFactory()
    .setPdxReadSerialized(true)
    .create();
```

On a listener that does not need a local `Order` class, keep the client read-serialized as well:

```java
ClientCache client = new ClientCacheFactory()
    .setPdxReadSerialized(true)
    .addPoolLocator("locator.example.net", 10334)
    .setPoolSubscriptionEnabled(true)
    .create();
```

Then handle the event defensively:

```java
final class OrderCqListener implements CqListener {
  @Override
  public void onEvent(CqEvent event) {
    Operation queryOperation = event.getQueryOperation();

    if (queryOperation.isClear() || queryOperation.isRegionInvalidate()) {
      clearView();
      return;
    }

    if (queryOperation.isDestroy()) {
      removeFromView(event.getKey());
      return;
    }

    Object value = event.getNewValue();

    if (value == null) {
      throw new IllegalStateException("CQ create/update event has no new value");
    }

    if (!(value instanceof PdxInstance order)) {
      throw new IllegalStateException(
          "Expected PDX but received " + value.getClass().getName());
    }

    Object rawTotal = order.getField("total");
    if (!(rawTotal instanceof Number total)) {
      throw new IllegalStateException("orders.total is not numeric: " + rawTotal);
    }

    applyToView(event.getKey(), total.doubleValue(), queryOperation);
  }

  @Override
  public void onError(CqEvent event) {
    log.error("CQ error key={} baseOp={} queryOp={}",
        event.getKey(), event.getBaseOperation(), event.getQueryOperation(),
        event.getThrowable());
  }

  @Override
  public void close() {}
}
```

PDX removes the domain-class dependency only for entries actually encoded as PDX; writers still need a compatible query-facing contract for fields the predicate relies on. For versions of the same PDX class, the physical type of an existing named field cannot change. Add a new field when changing representation, deploy readers that understand both, and migrate data deliberately.

## Separate Server Evaluation from Client Deserialization

Run the same CQ in two modes during diagnosis. A running CQ must be stopped before it can be executed again:

```java
CqQuery cq = queryService.newCq("large-orders", query, attributes);

// Starts event delivery without returning current values.
cq.execute();
```

If `execute()` works, stop that run before testing initial results:

```java
cq.stop();
CqResults<?> initial = cq.executeWithInitialResults();
```

If `execute()` works but `executeWithInitialResults()` fails, investigate both the server-side evaluation of current entries and the result-return path. Run the equivalent ordinary server query against a small, known population to expose field-access errors, then check result serialization and client deserialization.

`executeWithInitialResults()` returns rows containing keys and values and can also take long enough to hit the pool read timeout on a large data set. A timeout is not a serialization mismatch, so correlate the client exception with server logs and CQ statistics before changing types. If initial state is required, restrict region size or raise the read timeout based on a measured upper bound; do not blindly use a huge timeout for an unbounded result.

If plain `execute()` also fails, focus on the common registration prerequisites: CQ legality, region availability and type, pool subscriptions and connectivity, and security. Remember that a successful ordinary OQL query does not prove the full CQ is legal; it only tests the server's ability to evaluate the value.

## Understand PDX Versioning Boundaries

Adding or removing a PDX field is supported. A missing field can produce a default value when materialized into a newer domain class, while `PdxInstance.hasField()` can detect whether it exists in a particular record. That does not make every CQ predicate version-safe.

For a rolling addition, first query a field common to all versions. If a new predicate depends on a new field, backfill old entries or design the expression and data so missing fields have intentional behavior. Do not assume that comparing `UNDEFINED`, null, a primitive default, and a real value gives the same result.

Leave `ignore-unread-fields` false on members that deserialize and reserialize evolving values. Otherwise an older member can discard a field that it did not understand. Persist the PDX metadata registry when PDX is combined with persistent regions or regions that use a gateway sender.

## Check Security Errors Before Blaming Serialization

With Geode integrated security enabled, `QueryService.newCq` requires read permission on the region, and executing the CQ with either `execute()` or `executeWithInitialResults()` requires both `DATA:READ:<region>` and `CLUSTER:MANAGE:QUERY`. Queries that invoke object methods are also checked by the configured method invocation authorizer. A `NotAuthorizedException` or a method-authorizer rejection is a security problem even when it appears while the server is reflecting over a value.

Prefer direct PDX field access in CQ predicates. It needs less classpath surface and avoids arbitrary domain-method invocation. If a method is genuinely required, authorize only that method and class rather than switching to an unrestricted authorizer.

## A Repeatable Troubleshooting Sequence

Use this order to avoid changing several variables at once:

1. Verify the region exists on every eligible server and is partitioned, or is replicated without local-destroy eviction.
2. Reduce the CQ to `SELECT * FROM /region alias WHERE alias.simpleField = literal`.
3. Confirm the pool has `subscription-enabled=true`.
4. Compare `execute()` with `executeWithInitialResults()`.
5. Inspect server logs and listener `onError` for the first nested exception.
6. Identify the exact key and producer for the failing value.
7. Inspect its PDX type name, field names, and field value classes.
8. Compare deployed JARs and PDX settings on every server, including redundancy targets.
9. Put one known-good non-matching value, update it to matching, update it again while it still matches, then update it to non-matching. Move it back into the result and destroy it to test a base-region destroy as well.
10. Fail over the primary subscription server and repeat the test.

A correct test covers three CQ transitions: non-match to match produces a query `CREATE`, match to match produces `UPDATE`, and match to non-match produces `DESTROY`. The base-region operation can differ from the query-result operation, so log both.

## Conclusion

A CQ serialization mismatch is best treated as a pipeline failure, not a listener bug. Establish which stage fails, make the CQ legal, inventory classes and serializers on every eligible server and client, inspect the exact stored value, and standardize writers on one PDX schema. Keeping field evaluation and event consumption on `PdxInstance` removes unnecessary domain-class coupling while preserving explicit checks where compatibility actually matters.

## Official References

- [Implementing continuous querying](https://geode.apache.org/docs/guide/latest/developing/continuous_querying/implementing_continuous_querying.html)
- [How continuous querying works](https://geode.apache.org/docs/guide/latest/developing/continuous_querying/how_continuous_querying_works.html)
- [Requirements for custom classes in cached data](https://geode.apache.org/docs/guide/latest/basic_config/data_entries_custom_classes/using_custom_classes.html)
- [Querying serialized objects](https://geode.apache.org/docs/guide/latest/developing/query_select/the_where_clause.html)
- [Programming applications to use PdxInstance](https://geode.apache.org/docs/guide/latest/developing/data_serialization/program_application_for_pdx.html)
- [Setting up the server classpath](https://geode.apache.org/docs/guide/latest/getting_started/setup_classpath.html)
- [Implementing authorization](https://geode.apache.org/docs/guide/latest/security/implementing_authorization.html)
- [`CqQuery` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/CqQuery.html)
- [`PdxInstance` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/pdx/PdxInstance.html)
