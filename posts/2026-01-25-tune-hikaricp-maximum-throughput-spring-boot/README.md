# How to Tune HikariCP for Maximum Throughput in Spring Boot

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Java, HikariCP, Spring Boot, Connection Pool, Performance

Description: HikariCP is the default connection pool in Spring Boot and one of the fastest available. But out-of-the-box settings rarely match your workload. This guide walks through the key configuration parameters and how to tune them for maximum throughput.

---

Connection pooling is one of those things that "just works" until it doesn't. You spin up a Spring Boot app, it connects to the database, queries run fine. Then traffic spikes, latency climbs, and you start seeing `Connection is not available, request timed out` errors in your logs. The culprit is almost always an under-tuned connection pool.

HikariCP ships as the default pool in Spring Boot for good reason - it's lightweight, fast, and well-designed. But the defaults are conservative. They're meant to be safe, not optimal. If you want maximum throughput, you need to understand what each setting does and tune it for your specific workload.

## Understanding Connection Pool Basics

Before diving into configuration, let's establish why connection pools matter. Opening a database connection is expensive - it involves TCP handshakes, authentication, and session initialization. A pool maintains a set of ready-to-use connections so your application can borrow one, execute queries, and return it quickly.

The key insight is that your pool size directly affects concurrency. Too few connections and requests queue up waiting. Too many and you overwhelm the database, context-switch excessively, and actually reduce throughput. Finding the sweet spot requires knowing your workload.

## Core HikariCP Properties in Spring Boot

Here's a production-ready configuration that you can drop into `application.yml` and adjust based on your needs:

```yaml
spring:
  datasource:
    hikari:
      # Pool sizing - start here for tuning
      maximum-pool-size: 20
      minimum-idle: 10

      # Connection lifecycle
      max-lifetime: 1800000      # 30 minutes
      idle-timeout: 600000       # 10 minutes
      connection-timeout: 30000  # 30 seconds

      # Validation
      validation-timeout: 5000   # 5 seconds

      # Leak detection - invaluable for debugging
      leak-detection-threshold: 60000  # 1 minute
```

Let's break down what each of these does and how to think about tuning them.

## Pool Sizing: The Most Important Setting

The `maximum-pool-size` setting caps how many connections HikariCP will open to your database. This is where most tuning effort should focus.

A common mistake is setting this too high. More connections don't automatically mean better performance. The HikariCP wiki famously recommends a formula based on the number of CPU cores:

```
connections = ((core_count * 2) + effective_spindle_count)
```

For SSDs, effective spindle count is typically 1. So a 4-core machine would get `(4 * 2) + 1 = 9` connections. That feels low, but database connections spend most of their time waiting on I/O, not executing. A small number of connections can handle surprisingly high throughput if queries are efficient.

In practice, I start with `maximum-pool-size` between 10 and 20 for most web applications and adjust based on monitoring. Here's how to configure it programmatically if you need more control:

```java
@Configuration
public class HikariConfig {

    @Bean
    @ConfigurationProperties("spring.datasource.hikari")
    public HikariDataSource dataSource() {
        HikariDataSource ds = new HikariDataSource();

        // Calculate pool size based on available processors
        int cores = Runtime.getRuntime().availableProcessors();
        int poolSize = (cores * 2) + 1;

        // Cap at a reasonable maximum
        ds.setMaximumPoolSize(Math.min(poolSize, 20));
        ds.setMinimumIdle(poolSize / 2);

        return ds;
    }
}
```

The `minimum-idle` setting controls how many connections HikariCP keeps warm even when idle. Setting this equal to `maximum-pool-size` means the pool stays fully populated - good for steady traffic but wastes resources during quiet periods. I typically set it to half the maximum.

## Connection Timeouts: Fail Fast or Wait Patiently

The `connection-timeout` setting determines how long a thread waits to borrow a connection before giving up. The default is 30 seconds, which is an eternity in request-response applications.

For web services, I often lower this to 10 seconds or less:

```yaml
spring:
  datasource:
    hikari:
      connection-timeout: 10000  # 10 seconds - fail fast
```

When the pool is exhausted, it's usually better to return an error quickly than to queue up requests. Those queued requests consume memory and thread pool slots, making the problem worse. Failing fast lets load balancers route traffic elsewhere and gives the system a chance to recover.

## Validation and Lifecycle Settings

HikariCP validates connections before handing them out to ensure they're still alive. The `validation-timeout` setting controls how long this check can take. Keep it shorter than your `connection-timeout`:

```yaml
validation-timeout: 5000  # Must be less than connection-timeout
```

The `max-lifetime` setting controls how long a connection lives before HikariCP retires it. This matters because:

1. Databases and firewalls often kill idle connections
2. Long-lived connections can accumulate session state
3. Periodic recycling helps rebalance load after failovers

Set `max-lifetime` to a few minutes less than your database's connection timeout. If PostgreSQL kills connections at 30 minutes, set HikariCP to 28 minutes:

```yaml
max-lifetime: 1680000  # 28 minutes - less than database timeout
```

## Leak Detection: Your Best Friend in Production

Connection leaks happen when code borrows a connection but never returns it. This slowly drains the pool until the application grinds to a halt. HikariCP can detect leaks by tracking how long connections are held:

```java
@Bean
public HikariDataSource dataSource() {
    HikariDataSource ds = new HikariDataSource();
    ds.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
    ds.setUsername("app");
    ds.setPassword("secret");

    // Log a warning if a connection is held longer than 60 seconds
    ds.setLeakDetectionThreshold(60000);

    return ds;
}
```

When a leak is detected, HikariCP logs the stack trace showing where the connection was borrowed. This is invaluable for tracking down missing `close()` calls or transactions that never commit.

In development, set this aggressively low - maybe 5 seconds. In production, set it high enough that legitimate long-running queries don't trigger false alarms.

## Monitoring Pool Health

Configuration is only half the battle. You need visibility into how the pool behaves under load. HikariCP exposes metrics that you should wire into your monitoring system:

```java
@Configuration
public class HikariMetricsConfig {

    @Bean
    public HikariDataSource dataSource(MeterRegistry registry) {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
        ds.setMetricRegistry(registry);

        // Now you get metrics like:
        // hikaricp.connections.active
        // hikaricp.connections.idle
        // hikaricp.connections.pending
        // hikaricp.connections.acquire (timer)

        return ds;
    }
}
```

The metrics to watch are:

- **connections.pending**: Threads waiting for a connection. If this stays above zero, your pool is too small.
- **connections.active**: Connections currently in use. If this equals max-pool-size frequently, you're at capacity.
- **connections.acquire**: Time to borrow a connection. Spikes here indicate pool exhaustion.

Set alerts on `pending` and `acquire` time. When they spike, you've either hit your pool limit or the database is slow.

## Common Pitfalls to Avoid

A few mistakes I see repeatedly when teams tune HikariCP:

**Setting pool size equal to max database connections.** If your database allows 100 connections and you have 5 application instances, don't set each pool to 100. You'll overwhelm the database. Divide appropriately and leave headroom for admin connections.

**Ignoring the database side.** HikariCP is half the equation. Make sure your PostgreSQL `max_connections` or MySQL `max_connections` can actually support your total pool size across all instances.

**Not testing under load.** Defaults work fine in development. Always load test with realistic traffic patterns before deploying configuration changes.

**Tuning once and forgetting.** Traffic patterns change, queries evolve, and infrastructure scales. Revisit your pool configuration when you add instances, change database hardware, or notice latency regressions.

## Quick Reference Configuration

Here's a template to start with for a typical Spring Boot web application:

```yaml
spring:
  datasource:
    url: jdbc:postgresql://db-host:5432/myapp
    username: app_user
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 15
      minimum-idle: 5
      connection-timeout: 10000
      idle-timeout: 300000
      max-lifetime: 1680000
      validation-timeout: 5000
      leak-detection-threshold: 60000
      pool-name: MyAppPool
```

Start here, monitor the metrics, and adjust based on what you observe. There's no universal "best" configuration - only the right configuration for your workload.

---

**Bottom line:** HikariCP's defaults are safe but not optimal. Right-size your pool based on cores, set aggressive timeouts to fail fast under pressure, enable leak detection, and instrument everything. Connection pool tuning isn't glamorous work, but it's often the difference between an application that scales gracefully and one that falls over at the worst possible moment.
