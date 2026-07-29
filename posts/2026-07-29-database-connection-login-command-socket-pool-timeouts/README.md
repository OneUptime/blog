# Database Connection, Login, Command, Socket, and Pool Timeouts Explained

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Database, SQL, JDBC, PostgreSQL, Connection Pooling, Timeout

Description: Map database timeout names to the phase they protect, with concrete JDBC, PostgreSQL, and HikariCP examples and guidance for composing a full deadline.

---

A database timeout is not one setting. A request can wait for a pool slot, establish a network connection, authenticate, wait on a lock, execute a statement, and then block while reading a network response. Different libraries and database products place timers around different parts of that sequence.

This is why increasing a command timeout does not fix a pool-acquisition timeout, and why a socket timeout can destroy a connection even when a query timeout would have left it reusable.

## The Five Common Boundaries

| Timeout | What the caller is waiting for | Typical failure meaning |
| --- | --- | --- |
| Pool acquisition | A reusable connection from the client-side pool | All permitted connections are busy, still being created, or leaked |
| Connect | A physical path to the database endpoint | DNS, routing, firewall, TCP, proxy, or endpoint availability problem |
| Login | The driver to complete database connection and authentication | Connection establishment, TLS, authentication, or startup handshake exceeded the driver limit |
| Command or query | A statement or command to finish | Slow execution, lock wait, overload, or a deliberately bounded query |
| Socket or network | A database response on the underlying connection | Network partition, broken intermediary, stalled server, or lower-level I/O failure |

The names are not standardized across all drivers. Some products combine connect and login. Some use read timeout or socket timeout for network I/O. A pool's `connectionTimeout` often means waiting for a pooled connection, while a driver's similarly named setting means creating a physical connection.

Always read the documentation for the exact driver, pool, and database version in use.

## Pool Acquisition Timeout

A pool acquisition timeout starts when application code asks the pool for a connection. It stops when the pool lends one or the wait limit expires. It does not normally measure how long SQL executes after checkout.

HikariCP calls this setting `connectionTimeout`. When the pool has reached `maximumPoolSize` and no idle connection is available, `getConnection()` waits up to that duration before throwing `SQLException`.

```java
HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://db.example.internal/orders");
config.setUsername("app");
config.setPassword(System.getenv("DB_PASSWORD"));
config.setMaximumPoolSize(20);
config.setConnectionTimeout(250);

HikariDataSource dataSource = new HikariDataSource(config);
```

Here, 250 milliseconds is the minimum HikariCP permits for `connectionTimeout`. That value is illustrative and can be too short for many workloads.

If this timer fires only under load, inspect active, idle, total, and waiting connection metrics before increasing the pool. Common causes include slow queries, long transactions, leaked checkouts, a database connection cap shared by many application replicas, and request concurrency that has no admission control.

## Connect and Login Timeouts

A connect timeout generally bounds physical connection establishment. PostgreSQL libpq exposes `connect_timeout` in seconds:

```text
host=db.example.internal port=5432 dbname=orders connect_timeout=5
```

PostgreSQL documents that zero, a negative value, or an omitted value means waiting indefinitely in libpq. It also applies the limit separately to each host name or address in a multi-host configuration, so total elapsed time can be longer.

JDBC defines a login timeout through `DriverManager` and `DataSource`:

```java
DriverManager.setLoginTimeout(5);
Connection connection = DriverManager.getConnection(jdbcUrl, properties);
```

The JDBC API describes this as the maximum time a driver waits while attempting to connect after the driver has been identified. Driver support and the exact phases covered remain implementation-specific. Do not assume that a URL property named `connectTimeout` and `DriverManager.setLoginTimeout()` are interchangeable.

In a pool, physical connections may be created by background workers rather than the request thread. A pool acquisition timeout can therefore expire while the pool is still trying to create a connection under a different driver timeout.

## Command and Query Timeouts

A command timeout limits database work requested through a statement. JDBC exposes `Statement.setQueryTimeout()` in seconds:

```java
try (Connection connection = dataSource.getConnection();
     PreparedStatement statement = connection.prepareStatement(
         "select id, total from orders where customer_id = ?"
     )) {
    statement.setString(1, customerId);
    statement.setQueryTimeout(2);

    try (ResultSet rows = statement.executeQuery()) {
        while (rows.next()) {
            consume(rows);
        }
    }
}
```

JDBC specifies that the driver has at least attempted to cancel the running statement when it reports `SQLTimeoutException`. Cancellation semantics ultimately depend on the driver and database.

PostgreSQL also provides server-side `statement_timeout`:

```sql
SET LOCAL statement_timeout = '2s';

SELECT id, total
FROM orders
WHERE customer_id = $1;
```

`SET LOCAL` scopes the value to the current transaction. PostgreSQL measures `statement_timeout` from command arrival at the server until server completion. It is not the same clock as a client-side timer and does not include waiting for a pool slot before the command is sent.

PostgreSQL has more specific server limits too. `lock_timeout` applies only while acquiring a lock, and `idle_in_transaction_session_timeout` terminates a session that sits idle in an open transaction. These settings solve different problems and should not be grouped under one generic query timeout.

## Socket and Network Timeouts

A socket or network timeout protects against an established connection becoming unresponsive at the transport level. In JDBC, `Connection.setNetworkTimeout()` sets how long the connection waits for a database reply to a request. Pass an application-managed executor whose lifecycle is longer than the connection:

```java
static void configureNetworkTimeout(
    Connection connection,
    Executor abortExecutor
) throws SQLException {
    connection.setNetworkTimeout(abortExecutor, 5_000);
}
```

JDBC deliberately describes this as a severe boundary. If it expires, the driver marks the connection closed and releases its resources. By contrast, if a query timeout expires first and cancellation works over a healthy network, the statement and connection can remain usable.

For that reason, a network timeout is usually longer than the normal statement timeout. It is a last-resort guard against a broken communications path, not a substitute for bounding known expensive SQL.

Driver-specific properties such as `socketTimeout`, `readTimeout`, or `networkTimeout` do not have universal semantics. Confirm whether the timer applies to each read, an entire operation, or both reads and writes, and whether zero disables it.

## Timeout Ordering

Suppose an interactive request has 2.5 seconds left when it reaches the data layer. An illustrative policy might reserve:

- 150 milliseconds to acquire a pool slot;
- 300 milliseconds for a new physical connection if the pool must grow;
- 1.5 seconds for the statement;
- 2 seconds for a network-level last resort;
- the remaining time for application processing and returning the response.

These values do not simply add if phases overlap, and a driver can make multiple network exchanges under one API call. The outer request deadline must still be authoritative. Starting a 1.5-second query when only 200 milliseconds remain wastes database work after the caller leaves.

A useful ordering is:

```text
pool acquisition < remaining caller deadline
statement timeout < network timeout
all attempted work < outer request or job deadline
```

The exact numbers should come from latency objectives and load tests, not from this example.

## Diagnose by Phase

Record enough data to identify the timer that fired:

- pool name, size, active count, idle count, and waiting count;
- pool checkout wait duration;
- new-connection count, duration, and failures;
- database host or cluster endpoint, without credentials;
- statement fingerprint, execution duration, and lock-wait information;
- driver exception class, SQLSTATE, and vendor code;
- caller deadline remaining when database work began;
- connection disposition after a failure;
- retry attempt and idempotency information.

A message containing the word connection is not sufficient evidence. HikariCP's pool-acquisition `connectionTimeout`, PostgreSQL's physical `connect_timeout`, and JDBC's network timeout protect different resources.

## Common Configuration Failures

### One large timeout everywhere

Applying 30 seconds to every phase lets pool queues grow and keeps doomed work alive. Separate short admission waits from legitimate query execution and last-resort network failure detection.

### Only a server-side statement timeout

The request can still wait indefinitely before reaching the server or after the network becomes unresponsive. Protect client-side acquisition and I/O too.

### Only a socket timeout

The database can continue sending small amounts of data while a logically unacceptable query runs. Use a command or server statement timeout for the work itself.

### Increasing the pool on every acquisition timeout

More concurrent database sessions can reduce throughput by increasing CPU contention, lock contention, and context switching. First measure connection hold time, database saturation, and the total pool capacity across every application replica.

### Retrying every timeout

A command may have committed before a response was lost. A pool timeout may indicate overload that retries worsen. Retry only when both the failure is transient and the operation is safe to repeat.

## A Safe Rollout

1. Inventory every timeout from framework, pool, driver, proxy, database, and caller.
2. Map each setting to a phase and its units.
3. Add metrics before changing values.
4. Set an explicit outer deadline and propagate the remaining budget.
5. Configure pool acquisition to reject excessive queueing.
6. Configure query cancellation for expensive work.
7. Keep a longer network guard for broken connections.
8. Test slow authentication, pool exhaustion, lock waits, long queries, and network partitions independently.

Timeouts form a system. Their value comes from ending the correct wait, preserving enough evidence to identify that wait, and preventing abandoned work from consuming the next request's capacity.

## Official Documentation

- [PostgreSQL libpq connection parameters](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-PARAMKEYWORDS)
- [PostgreSQL client connection timeout settings](https://www.postgresql.org/docs/current/runtime-config-client.html#RUNTIME-CONFIG-CLIENT-STATEMENT)
- [JDBC DriverManager login timeout](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/DriverManager.html#setLoginTimeout(int))
- [JDBC Statement query timeout](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/Statement.html#setQueryTimeout(int))
- [JDBC Connection network timeout](https://docs.oracle.com/en/java/javase/17/docs/api/java.sql/java/sql/Connection.html#setNetworkTimeout(java.util.concurrent.Executor,int))
- [HikariCP configuration](https://github.com/brettwooldridge/HikariCP#gear-configuration-knobs-baby)
