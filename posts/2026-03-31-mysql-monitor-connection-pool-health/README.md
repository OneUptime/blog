# How to Monitor MySQL Connection Pool Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: MySQL, Connection Pool, Monitoring, Metric, Observability

Description: Learn how to monitor MySQL connection pool health across HikariCP, SQLAlchemy, and mysql2 using metrics, logging, and server-side status variables.

---

## Introduction

Monitoring connection pool health helps you detect exhaustion before it impacts users, identify connection leaks early, and validate that pool sizing is appropriate for your workload. This guide covers monitoring approaches for the most common MySQL pool libraries.

## Server-Side MySQL Metrics

Always start monitoring at the MySQL server level:

```sql
-- Current connection counts
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Threads_running';

-- Peak connection usage since server start
SHOW STATUS LIKE 'Max_used_connections';

-- Connection errors
SHOW STATUS LIKE 'Connection_errors_max_connections';
SHOW STATUS LIKE 'Aborted_connects';

-- Active transactions
SELECT COUNT(*) FROM information_schema.innodb_trx WHERE trx_state = 'RUNNING';
```

## HikariCP Metrics with JMX

Enable JMX in HikariCP and expose metrics programmatically:

```java
config.setRegisterMbeans(true);
config.setMetricRegistry(metricRegistry); // Dropwizard Metrics

// Or use HikariPoolMXBean directly
HikariPoolMXBean bean = hikariDataSource.getHikariPoolMXBean();

// Schedule periodic logging
ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();
scheduler.scheduleAtFixedRate(() -> {
    log.info("Pool={} | Active={} | Idle={} | Total={} | Waiting={}",
        hikariDataSource.getPoolName(),
        bean.getActiveConnections(),
        bean.getIdleConnections(),
        bean.getTotalConnections(),
        bean.getThreadsAwaitingConnection()
    );
}, 0, 30, TimeUnit.SECONDS);
```

## HikariCP with Micrometer (Spring Boot)

```java
// Add dependency: io.micrometer:micrometer-core
config.setMetricRegistry(meterRegistry);
```

Then query via Actuator:

```bash
curl http://localhost:8080/actuator/metrics/hikaricp.connections.active
curl http://localhost:8080/actuator/metrics/hikaricp.connections.pending
```

## SQLAlchemy Pool Monitoring (Python)

```python
from sqlalchemy import event, pool

@event.listens_for(engine, 'connect')
def on_connect(dbapi_conn, connection_record):
    print(f"New connection: {id(dbapi_conn)}")

@event.listens_for(engine, 'checkout')
def on_checkout(dbapi_conn, connection_record, connection_proxy):
    pool_status = engine.pool.status()
    print(f"Connection checked out | Pool: {pool_status}")

@event.listens_for(engine, 'checkin')
def on_checkin(dbapi_conn, connection_record):
    print(f"Connection returned to pool")

# Expose as metrics
def get_pool_metrics(engine):
    p = engine.pool
    return {
        "pool_size": p.size(),
        "checked_out": p.checkedout(),
        "overflow": p.overflow(),
        "checked_in": p.checkedin(),
    }
```

## Node.js mysql2 Pool Monitoring

```javascript
const pool = mysql.createPool({ connectionLimit: 10, ... });

// Track pool events
let activeConnections = 0;
pool.on('acquire', () => {
  activeConnections++;
  if (activeConnections >= 8) {
    console.warn(`Pool utilization high: ${activeConnections}/10`);
  }
});
pool.on('release', () => activeConnections--);

// Expose as health endpoint
app.get('/health/db', (req, res) => {
  res.json({
    pool_active: pool._allConnections.length,
    pool_free: pool._freeConnections.length,
    pool_queue: pool._connectionQueue.length,
  });
});
```

## Go database/sql Metrics

```go
func collectDBMetrics(db *sql.DB, registry *prometheus.Registry) {
    stats := db.Stats()

    openConns := prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "mysql_pool_open_connections",
    })
    openConns.Set(float64(stats.OpenConnections))

    inUse := prometheus.NewGauge(prometheus.GaugeOpts{
        Name: "mysql_pool_in_use_connections",
    })
    inUse.Set(float64(stats.InUse))

    waitCount := prometheus.NewCounter(prometheus.CounterOpts{
        Name: "mysql_pool_wait_total",
    })
    waitCount.Add(float64(stats.WaitCount))

    registry.MustRegister(openConns, inUse, waitCount)
}
```

## Key Health Indicators

| Metric | Healthy | Warning |
|---|---|---|
| Threads_running | < 25% of pool_size | > 75% of pool_size |
| Threads waiting | 0 | > 0 |
| Max_used_connections | < 80% of max_connections | > 90% |
| Aborted_connects | 0 | Any non-zero |

## Summary

Comprehensive pool health monitoring requires both server-side MySQL status variables and application-side pool metrics. At minimum, track active connections, idle connections, wait queue length, and `Max_used_connections`. Set alerts when `ThreadsAwaitingConnection > 0` (HikariCP) or `WaitCount` starts increasing (Go) to detect pool exhaustion before it causes user-facing errors.
