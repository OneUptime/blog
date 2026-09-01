# How to Set a Connection Timeout for an Apache Geode Client When No Locator Is Available

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Apache Geode, Java, Connection Timeout, Troubleshooting, Networking

Description: Bound Geode client socket connection attempts to unavailable locators and distinguish that setting from response, pool-exhaustion, and retry timeouts.

---

The Apache Geode client setting for connection establishment is the pool's **socket connect timeout**. In Java, configure it with `ClientCacheFactory.setPoolSocketConnectTimeout` for the default pool or `PoolFactory.setSocketConnectTimeout` for a named pool. In `client-cache.xml`, use the pool attribute `socket-connect-timeout`.

This timeout applies when opening a socket to either a locator or a cache server. Geode also reuses it for TLS and Geode connection handshakes and while sending a locator discovery request and waiting for its reply. It is not the same as the time allowed for a server to answer an ordinary region operation, and it is not necessarily a strict wall-clock deadline for the entire cache startup.

## Configure the Default Client Pool

The following client tries two locators and sets the socket connection-establishment timeout to three seconds:

```java
import org.apache.geode.cache.Region;
import org.apache.geode.cache.client.ClientCache;
import org.apache.geode.cache.client.ClientCacheFactory;
import org.apache.geode.cache.client.ClientRegionShortcut;
import org.apache.geode.cache.client.ServerConnectivityException;

ClientCache cache = new ClientCacheFactory()
    .addPoolLocator("locator-a.example.net", 10334)
    .addPoolLocator("locator-b.example.net", 10334)
    .setPoolSocketConnectTimeout(3_000)
    .setPoolReadTimeout(10_000)
    .setPoolRetryAttempts(0)
    .create();

Region<String, Order> orders = cache
    .<String, Order>createClientRegionFactory(ClientRegionShortcut.PROXY)
    .create("Orders");

try {
  // Force discovery and a server round trip; cache creation alone is not a readiness check.
  orders.containsKeyOnServer("__readiness__");
} catch (ServerConnectivityException unavailable) {
  cache.close();
  throw new IllegalStateException("Geode readiness check failed", unavailable);
}
```

`ClientCacheFactory.create()` starts the pool, but do not treat its return as proof that a usable locator and server have been reached. Current pool connection prefill is background work, and applications that require fail-fast startup should perform a harmless operation against a known server region, as above. Inspect the exception subclass and cause as well: a missing region, failed authorization, or unavailable server is different from an unavailable locator.

The latest Geode Java API documents a default socket connect timeout of 59,000 milliseconds and defines `0` as an infinite socket-connect timeout. Use a positive value for fail-fast startup. Values less than zero are rejected.

`setPoolRetryAttempts(0)` is shown to make ordinary operation retries explicit; it does not convert all discovery, DNS, TLS, and multi-endpoint work into one three-second deadline. Choose retry behavior based on whether an operation can safely fail over, not merely to make a test finish faster.

## Configure a Named Pool

When an application has several server groups or clusters, create and tune each pool separately:

```java
import org.apache.geode.cache.client.Pool;
import org.apache.geode.cache.client.PoolManager;

Pool ordersPool = PoolManager.createFactory()
    .addLocator("locator-a.example.net", 10334)
    .addLocator("locator-b.example.net", 10334)
    .setServerGroup("orders")
    .setSocketConnectTimeout(3_000)
    .setReadTimeout(10_000)
    .setRetryAttempts(0)
    .create("ordersPool");
```

Attach `ordersPool` to its client region with `ClientRegionFactory.setPoolName("ordersPool")`. A carefully tuned pool has no effect if the region silently uses the default pool.

The XML equivalent is:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<client-cache
    xmlns="http://geode.apache.org/schema/cache"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://geode.apache.org/schema/cache http://geode.apache.org/schema/cache/cache-1.0.xsd"
    version="1.0">
  <pool name="ordersPool"
        server-group="orders"
        socket-connect-timeout="3000"
        read-timeout="10000"
        retry-attempts="0">
    <locator host="locator-a.example.net" port="10334"/>
    <locator host="locator-b.example.net" port="10334"/>
  </pool>

  <region name="Orders" refid="PROXY">
    <region-attributes pool-name="ordersPool"/>
  </region>
</client-cache>
```

Keep the configuration in one place. A `client-cache.xml` pool and a programmatically created default pool can otherwise lead operators to tune a pool the application does not use.

## Know Which Timeout You Are Changing

Geode exposes several similarly named pool settings:

| Setting | What it bounds |
| --- | --- |
| `socket-connect-timeout` | Opening a TCP socket and completing connection handshakes; locator discovery request/reply also uses it |
| `read-timeout` | Waiting for a server response after an ordinary operation was sent |
| `free-connection-timeout` | Waiting for any free pooled connection when `max-connections` is exhausted |
| `server-connection-timeout` | Waiting for a free connection toward a specific server |
| `retry-attempts` | How many times an operation is retried after a timeout or exception |

Changing `read-timeout` does not make an unreachable or nonresponsive locator fail faster because locator connection and request/reply use `socket-connect-timeout`. Likewise, `free-connection-timeout` does not bound locator connection attempts; it addresses contention inside a bounded client pool.

## Understand the Real Elapsed Time

A three-second setting is not an end-to-end deadline. Overall failure can take longer because the client may try multiple configured locators, discover and try servers, or retry work according to other pool settings. The same value is reused for TCP connection attempts, TLS and Geode connection handshakes, and locator request/reply, so those phases can add elapsed time. Name resolution normally occurs before the socket connection and may be governed by the JVM and operating system rather than Geode's socket timeout. A later application request uses `read-timeout` while waiting for its server response.

Network behavior also changes the symptom. A host that immediately rejects a connection can fail well before the configured timeout. A firewall that silently drops packets commonly makes the attempt consume the timeout. Measure from the same container, pod, or host as the client; a laptop's route is not evidence for an application pod's route.

If the process has a hard startup service-level objective, combine Geode's per-attempt timeout with a process-level startup deadline enforced by the service supervisor or orchestrator. Report the complete exception chain when the deadline is exceeded. Do not abandon an arbitrary Java initialization thread and assume the singleton `ClientCache` was left cleanly initialized.

## Classify the Failure Correctly

`NoAvailableLocatorsException` means the client could not obtain a usable response from any locator known to the pool. `NoAvailableServersException` means the client cannot find or connect to a usable cache server; locators may still be reachable. Both derive from Geode's client connectivity exception hierarchy, so logging only the outer message can hide which hop failed.

Use this sequence during an incident:

1. Log the configured locator hostnames and ports without credentials.
2. Resolve each hostname from the client network namespace.
3. Test TCP reachability to each locator port.
4. Check locator logs. In a connected `gfsh` session, run `list members` to confirm cluster membership and `describe member --name=<server>` to verify that each cache-server endpoint is running.
5. Verify `hostname-for-clients` values returned for those servers are client-reachable.
6. Compare client and cluster TLS/security settings.
7. Record actual elapsed time along with locator count, connect timeout, read timeout, and retry count.

Do not configure one pool with both locators and direct servers: the Java factory rejects mixing those discovery modes. Multiple independent locators are the normal availability design. A direct-server pool is a separate topology choice, not an automatic fallback inside the same pool.

## Choose a Production Value

Set the connect timeout above normal TCP and handshake latency but below the time at which the caller or orchestrator gives up. Three to five seconds is a reasonable starting experiment on a low-latency private network, not a universal constant. Test a dropped-packet failure, a refused connection, an unresolvable name, an unavailable locator with a healthy second locator, and a locator that has no servers. These cases exercise different phases and prevent a misleading “timeout test” from validating only one path.

## Official Documentation

- [`ClientCacheFactory.setPoolSocketConnectTimeout` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/ClientCacheFactory.html#setPoolSocketConnectTimeout%28int%29)
- [`PoolFactory.setSocketConnectTimeout` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/PoolFactory.html#setSocketConnectTimeout%28int%29)
- [`client-cache` and pool attribute reference](https://geode.apache.org/docs/guide/latest/reference/topics/client-cache.html)
- [`NoAvailableLocatorsException` Java API](https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/client/NoAvailableLocatorsException.html)
- [How server discovery works](https://geode.apache.org/docs/guide/latest/topologies_and_comm/topology_concepts/how_server_discovery_works.html)

## Conclusion

Use `socket-connect-timeout` for locator or server connection establishment, including its TCP and handshake phases, and tune ordinary operation reads, pool waits, and retry behavior separately. Multiple locators, correct advertised server addresses, complete exception logging, and a measured process-level deadline produce predictable startup behavior without confusing one timeout layer for another.
