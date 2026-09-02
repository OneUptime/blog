# How to Receive Server-Side Region Events in a Geode Client with Continuous Queries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Event-Driven Architecture, Querying, Java, High Availability

Description: Build a Java Geode client that receives filtered server-region changes through a continuous query, with initial state, failover, and durable delivery.

---

Apache Geode continuous queries (CQs) let a client subscribe to changes that affect the result of an OQL predicate. The query runs on the server; matching result-set transitions arrive at client-side `CqListener` callbacks through Geode's subscription messaging system.

That is different from interest registration. A CQ is a notification service and does **not** update the client's region. If the application needs a local materialized view, its listener must maintain that view explicitly.

This guide builds a Java client for a server region named `/orders` and receives only orders whose status is `READY`.

## Create a Supported Server Region

CQs are supported on replicated and partitioned regions. They are not supported on a replicated region whose `local-destroy` eviction changes its data policy.

For a partitioned example:

```text
gfsh> create region --name=orders --type=PARTITION_REDUNDANT
gfsh> describe region --name=orders
```

Every server eligible to host the region must have compatible region, PDX, security, and application-class configuration. A CQ can run on a primary server and redundant subscription servers, so configuring only one server creates a latent failover failure.

## Enable the Client Subscription Pool

The pool that supplies the CQ's `QueryService` must have subscriptions enabled. Configure at least one redundant subscription server when missed notifications during a primary-server failure are unacceptable:

```java
ClientCache client = new ClientCacheFactory()
    .setPdxReadSerialized(true)
    .addPoolLocator("locator-a.example.net", 10334)
    .addPoolLocator("locator-b.example.net", 10334)
    .setPoolSubscriptionEnabled(true)
    .setPoolSubscriptionRedundancy(1)
    .setPoolReadTimeout(15_000)
    .create();

ClientRegionFactory<String, PdxInstance> regions =
    client.createClientRegionFactory(ClientRegionShortcut.PROXY);

Region<String, PdxInstance> orders = regions.create("orders");
```

A `PROXY` region stores no local values. That is a good default for a notification-only client. Use `CACHING_PROXY` only when the application separately needs a client cache; the CQ still will not populate or maintain that cache.

`subscription-redundancy=1` makes one secondary server maintain a backup queue. A value of zero, the default, has no backup. A value of `-1` uses every non-primary server as a secondary and can consume substantial queue memory.

If multiple pools exist, obtain the query service from the pool associated with `/orders`. A CQ and its client region must not accidentally use different server pools.

## Write a CQ-Compatible OQL Predicate

CQ syntax is intentionally restricted. Its `FROM` clause contains one region, and the query must select the whole value:

```sql
SELECT * FROM /orders o WHERE o.status = 'READY'
```

A CQ cannot use cross-region joins, nested-collection drill-downs, `DISTINCT`, projections, bind parameters, `ORDER BY`, `GROUP BY`, or aggregate functions. Put runtime literals into a safely generated query string or create a small fixed set of named CQs; unlike ordinary OQL, CQ bind parameters are not available.

Prefer PDX fields over domain-method calls. PDX allows the server to evaluate `status` without installing the client's `Order` class, and a client configured with `setPdxReadSerialized(true)` can inspect events without deserializing a domain object.

## Implement the Listener

`CqEvent` exposes two operations:

- `getBaseOperation()` is what happened to the region entry; and
- `getQueryOperation()` is what happened to the CQ result set.

For example, a base-region update from `NEW` to `READY` is a query-result `CREATE`. An update from `READY` to `SHIPPED` is a query-result `DESTROY`, even though no region entry was destroyed.

```java
final class ReadyOrderListener implements CqStatusListener {
  private final BlockingQueue<Runnable> workQueue;

  ReadyOrderListener(BlockingQueue<Runnable> workQueue) {
    this.workQueue = workQueue;
  }

  @Override
  public void onEvent(CqEvent event) {
    Object key = event.getKey();
    Operation queryOperation = event.getQueryOperation();
    Object newValue = event.getNewValue();

    // Keep the Geode subscription callback short and non-blocking.
    boolean accepted = workQueue.offer(() -> {
      if (queryOperation.isDestroy()) {
        removeReadyOrder(key);
        return;
      }

      if (!(newValue instanceof PdxInstance order)) {
        throw new IllegalStateException(
            "Expected PDX order, got " + newValue.getClass().getName());
      }

      upsertReadyOrder(
          key,
          (String) order.getField("status"),
          (String) order.getField("customerId"));
    });

    if (!accepted) {
      recordBackpressureFailure(key, queryOperation);
    }
  }

  @Override
  public void onError(CqEvent event) {
    log.error("CQ error: key={} baseOp={} queryOp={}",
        event.getKey(), event.getBaseOperation(), event.getQueryOperation());
  }

  @Override
  public void onCqConnected() {
    health.setReady(true);
  }

  @Override
  public void onCqDisconnected() {
    health.setReady(false);
  }

  @Override
  public void close() {
    health.setReady(false);
  }
}
```

Do not perform slow HTTP calls, database transactions, or unbounded retries on the subscription callback thread. Hand off to a bounded executor or queue, define an overload policy, and make downstream processing idempotent. A new primary can resend events after failover; the client normally discards them, but an expired client message-tracking entry can let a duplicate through. Durable reconnects replay retained events, and application restarts can also cause an initial snapshot plus an event to describe the same logical state.

For destroy-like query transitions, `getNewValue()` can be null. Branch on `getQueryOperation()` before casting the value.

## Create and Execute the CQ

Attach the listener, assign the CQ a unique client-local name, and execute it:

```java
QueryService queryService = client.getQueryService();

CqAttributesFactory attributesFactory = new CqAttributesFactory();
attributesFactory.addCqListener(new ReadyOrderListener(workQueue));

CqQuery readyOrders = queryService.newCq(
    "ready-orders-v1",
    "SELECT * FROM /orders o WHERE o.status = 'READY'",
    attributesFactory.create());

readyOrders.execute();
```

`execute()` starts notifications without returning existing matches. Use it when the listener cares only about changes after registration.

When the client needs a consistent starting result, use `executeWithInitialResults()`:

```java
CqResults<?> initial = readyOrders.executeWithInitialResults();

for (Object result : initial) {
  Struct row = (Struct) result;
  Object key = row.get("key");
  PdxInstance value = (PdxInstance) row.get("value");
  seedReadyOrder(key, value);
}
```

Geode registers the CQ while producing the initial result so events can continue after the snapshot. Still make the materialization logic idempotent: an event may supersede an initial row before the application finishes applying the snapshot. Large initial result sets can run long enough to hit the pool read timeout and can consume substantial client memory; choose a selective CQ or build initial state through a separately bounded workflow.

Close the CQ when its lifecycle ends:

```java
readyOrders.close();
client.close();
```

`stop()` pauses a CQ without releasing all resources and `execute()` resumes it. `close()` is terminal for that `CqQuery` object.

## Know the Query-Operation Transitions

For an entry update, the predicate's old and new truth values determine the query operation:

| Old value matches | New value matches | Listener result operation |
| --- | --- | --- |
| No | No | No CQ event |
| No | Yes | `CREATE` |
| Yes | Yes | `UPDATE` |
| Yes | No | `DESTROY` |

This is why code that branches only on `getBaseOperation()` produces a stale materialized view. Test all four cases, plus a real base-region destroy and invalidation behavior used by the application.

## Make the CQ Durable When Disconnects Must Be Replayed

Subscription redundancy protects a connected client from a server failure. It does not retain messages while the client application is deliberately offline. Durable messaging is a separate feature.

Give the client a stable durable ID and timeout:

```java
Properties properties = new Properties();
properties.setProperty("durable-client-id", "ready-orders-consumer-1");
properties.setProperty("durable-client-timeout", "300");

ClientCache client = new ClientCacheFactory(properties)
    .setPdxReadSerialized(true)
    .addPoolLocator("locator-a.example.net", 10334)
    .setPoolSubscriptionEnabled(true)
    .setPoolSubscriptionRedundancy(1)
    .create();
```

Create the CQ as durable using the `newCq` overload whose final argument is `true`, execute it, finish installing all listeners, then signal readiness:

```java
CqQuery readyOrders = queryService.newCq(
    "ready-orders-v1", query, cqAttributes, true);

readyOrders.execute();
client.readyForEvents();
```

To keep the durable server queue during an intentional disconnect:

```java
client.close(true); // keepalive
```

The durable CQ must be running at disconnect. Reconnect with the same durable client ID, the same CQ name, and the same durability. Size the durable timeout and server queues from measured event rates. Retaining every noncritical event during a long outage can exhaust server memory or disk; store only subscriptions whose replay is actually required.

## Secure and Observe the Subscription

With integrated security, `QueryService.newCq` requires `DATA:READ:orders`, while executing the CQ with either `execute()` or `executeWithInitialResults()` requires both `DATA:READ:orders` and `CLUSTER:MANAGE:QUERY`. Stopping a CQ requires `CLUSTER:MANAGE:QUERY`. Grant the client exactly the operations its lifecycle uses. When OQL invokes methods, the server's method invocation authorizer also applies.

Monitor at least:

- `CqStatusListener` connection state;
- CQ event and error counts;
- bounded work-queue depth and rejected handoffs;
- client pool primary and redundancy state;
- durable pending-event count on reconnect; and
- server subscription queue memory, overflow, and expiration.

An apparently silent CQ is often one of five things: its pool has subscriptions disabled, the query never crosses a result boundary, the region is unsupported, the client is disconnected, or the listener is blocked. Log query and base operations with keys during a controlled test to distinguish them.

## Conclusion

Enable subscriptions on the CQ's pool, use a supported one-region `SELECT *` predicate, and interpret query-result operations rather than only base-region operations. Keep listener callbacks fast, use PDX when servers should not load client domain classes, choose initial results deliberately, and add both subscription redundancy and durable messaging only for the failure windows they address.

## Official References

- [How continuous querying works](https://geode.apache.org/docs/guide/latest/developing/continuous_querying/how_continuous_querying_works.html)
- [Implementing continuous querying](https://geode.apache.org/docs/guide/latest/developing/continuous_querying/implementing_continuous_querying.html)
- [Managing continuous querying](https://geode.apache.org/docs/guide/latest/developing/continuous_querying/continuous_querying_manage.html)
- [Configuring highly available servers](https://geode.apache.org/docs/guide/latest/developing/events/configuring_highly_available_servers.html)
- [Implementing durable client/server messaging](https://geode.apache.org/docs/guide/latest/developing/events/implementing_durable_client_server_messaging.html)
- [Implementing authorization](https://geode.apache.org/docs/guide/latest/managing/security/implementing_authorization.html)
- [`CqQuery` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/CqQuery.html)
- [`CqEvent` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/CqEvent.html)
- [`CqStatusListener` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/query/CqStatusListener.html)
