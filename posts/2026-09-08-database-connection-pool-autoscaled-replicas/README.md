# How to Size Database Connection Pools Across Autoscaled Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Capacity Planning, PostgreSQL, Autoscaling, Performance, Scalability

Description: Allocate a tested database concurrency budget across maximum application replicas, background workers, failover paths, and operational reserves.

---

A per-replica connection pool that is safe at three replicas can overwhelm the database at thirty. Autoscaling multiplies pool limits, idle connections, login bursts, prepared state, and query concurrency unless the database budget is designed globally.

Start at the database, reserve operational access, then divide the remaining tested concurrency across every possible client.

## Separate connection slots from useful concurrency

PostgreSQL `max_connections` is a hard server setting, not a throughput recommendation. PostgreSQL documents that increasing it raises resource allocations, including shared memory. The database may reach its CPU, I/O, lock, or memory knee far below that number.

Determine two limits:

```text
hard application slots = max_connections - protected and non-application slots
tested active-query limit = highest concurrent database work meeting the SLO
```

The usable budget is the smaller constraint after accounting for pooling mode. Idle session connections consume slots but are not active queries; transaction-level proxies can multiplex sessions onto fewer server connections, with compatibility tradeoffs.

Reserve capacity explicitly for:

- PostgreSQL superuser and reserved connections;
- replication, monitoring, backups, migrations, and maintenance;
- administration during an incident;
- background workers and scheduled jobs;
- blue-green overlap, rolling deployments, and failover;
- non-application clients and direct reporting access.

Never consume PostgreSQL's final superuser reserve in the normal application budget.

## Inventory every pool multiplier

For each workload record the maximum number of replicas, pools per process, processes per Pod or host, maximum connections per pool, and any direct connections:

```text
possible server connections
  = sum(max replicas_i * processes_i * pools_i * pool max_i)
  + fixed clients
```

Use autoscaling maximums, not today's desired count. Include old and new replica sets that coexist during a rollout. If a worker and web process have separate pools in the same Pod, count both.

## Work a global budget example

Assume PostgreSQL allows 500 connections. The plan protects 20 for privileged and incident access, 15 for replication and monitoring, and 15 for migrations, reporting, and other fixed clients:

```text
hard application budget = 500 - 20 - 15 - 15 = 450
```

Load testing shows the database meets its latency objective with at most 420 active application sessions. Use 420 as the tighter global budget.

The web tier can scale to 30 replicas, and batch workers need up to 60 database connections:

```text
web pool max per replica = floor((420 - 60) / 30) = 12
web maximum              = 30 * 12 = 360
total planned maximum    = 360 + 60 = 420
```

At five ordinary web replicas, a pool of 12 may still provide enough throughput because connections are reused. At thirty replicas it stays within the same global database concurrency envelope.

This arithmetic prevents hard exhaustion but does not prove 12 is optimal. Test pool sizes around the candidate. HikariCP's guidance emphasizes that smaller saturated pools often outperform very large pools and presents its CPU-and-storage formula only as a starting point for measurement.

## Estimate demand before testing

Little's Law provides an initial active-connection estimate when one request holds one connection:

```text
mean held connections = database operations/second * mean hold time seconds
```

At 4,000 database operations per second and 6 ms mean checkout-to-return time, mean occupancy is 24 connections. Tail queries, transactions that hold connections across application work, and multiple nested acquisitions require direct measurement. Instrument acquisition wait, hold time, active, idle, pending, timeout, and connection-creation latency.

Do not multiply frontend RPS by database latency unless every request makes exactly one database operation and the measurement boundaries align. Split query classes and sum their concurrency contributions.

## Handle scaling and deployment transients

New replicas can start simultaneously and create a connection storm. Use jittered initialization, bounded connection creation, and readiness that does not open an entire pool at once. Keep minimum idle connections low unless measured spike behavior requires otherwise. A high minimum across many idle replicas consumes slots without adding database throughput.

During rollout, calculate surge explicitly:

```text
planned rollout connection holders
  = desired replicas
  + resolved maxSurge
  + terminating Pods that can still hold connections
```

Resolve a percentage `maxSurge` to its integer value. Kubernetes documents that terminating Pods are not included in the Deployment availability calculation, so total resource consumers can temporarily exceed `replicas + maxSurge` until their termination grace period ends. Measure this overlap, and use `.status.terminatingReplicas` where the supported feature is enabled.

During failover, clients may reconnect in a synchronized wave while old TCP sessions have not yet cleared. Test DNS or proxy convergence, connection lifetime, backoff with jitter, and acquisition timeouts. The database pool timeout should be shorter than the request deadline by enough time to return a controlled failure.

## Consider a server-side pooler

PgBouncer can reduce PostgreSQL backend connections. Transaction pooling assigns a server connection for a transaction rather than an entire client session, but applications must not rely on unsupported session-scoped behavior across transactions. Review prepared statements, `SET` behavior, temporary objects, advisory locks, and driver compatibility for the deployed PgBouncer version.

A proxy adds its own client limits, queues, failure modes, and observability. Budget both client-side and server-side pools and preserve administrative access that does not depend on an overloaded application proxy.

## Validate the complete replica range

Load test minimum, ordinary, maximum, rollout-surge, and failover replica counts while keeping total offered work controlled. Confirm:

- useful transaction throughput and latency;
- database CPU, I/O, locks, memory, and active sessions;
- pool acquisition wait and timeouts per replica;
- fairness between web, batch, and administrative classes;
- stable behavior when the global budget is reached;
- no reconnection storm after database restart or failover.

Alert on both absolute global occupancy and waiting demand. An 80 percent full pool with rapidly rising acquisition latency may be more urgent than a full pool whose brief queue remains within the request SLO.

## Conclusion

Treat database connections as one shared concurrency budget. Subtract operational and fixed clients, cap the result at the database's tested SLO-safe concurrency, and divide it across maximum replicas plus deployment and failover overlap. Test pool acquisition, query throughput, and reconnect behavior across the full autoscaling range rather than copying one per-instance default.

## Official Documentation

- [PostgreSQL connection settings](https://www.postgresql.org/docs/current/runtime-config-connection.html)
- [PostgreSQL resource consumption settings](https://www.postgresql.org/docs/current/runtime-config-resource.html)
- [HikariCP configuration and maximumPoolSize](https://github.com/brettwooldridge/HikariCP)
- [HikariCP pool sizing guidance](https://github.com/brettwooldridge/HikariCP/wiki/About-Pool-Sizing)
- [PgBouncer feature matrix and pooling modes](https://www.pgbouncer.org/features.html)
- [PgBouncer configuration](https://www.pgbouncer.org/config.html)
- [Kubernetes Deployment rolling updates and terminating Pods](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
