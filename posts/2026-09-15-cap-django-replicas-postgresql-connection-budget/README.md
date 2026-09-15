# How to Cap Django Replica Growth Using a PostgreSQL Connection Budget

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Django, PostgreSQL, Kubernetes, Capacity Planning, Autoscaling

Description: Derive a Django replica ceiling from PostgreSQL connection slots, worker topology, and rolling-update overlap.

---

Adding Django replicas can exhaust PostgreSQL connections before it increases useful throughput. Each replica brings application processes and threads, and a rolling update can keep old connections alive while new processes connect.

Calculate the maximum simultaneous connection demand first. Then set the replica ceiling and rollout policy to fit that budget. The worked example uses Django 5.2 with direct PostgreSQL connections and a bounded WSGI worker configuration.

## Establish the PostgreSQL allowance

Read the server's actual settings:

```sql
SHOW max_connections;
SHOW superuser_reserved_connections;
SHOW reserved_connections;
```

The last setting is available on PostgreSQL versions that support reserved-role slots; omit it on older versions and account for their supported reservation mechanisms. PostgreSQL reserves slots for superusers and, where configured, roles with `pg_use_reserved_connections` privileges. Application roles should not consume the operational reserve. Raising `max_connections` also increases some server resource allocations. [PostgreSQL connection settings](https://www.postgresql.org/docs/current/runtime-config-connection.html).

Suppose the capacity agreement is:

| Allocation | Connections |
| --- | ---: |
| Configured maximum | 400 |
| Superuser reserve | -10 |
| Reserved-role slots | -20 |
| Other applications and background clients | -40 |
| Additional operational headroom | -30 |
| Available to this Django API | **300** |

The operational headroom is an explicit planning choice. Count migrations, administration, reporting, and job workers in the appropriate allocation without subtracting the same connection twice. Use the smallest relevant allowance if failover can move traffic to a smaller server.

## Count connections per replica

Django documents that each thread maintains its own connection. For a WSGI deployment with four worker processes and five database-using threads per process, a conservative direct-connection envelope for one database alias is:

```text
connections per replica = 4 * 5 = 20
```

Connections open lazily, but persistent connections can remain idle while still consuming PostgreSQL slots. Budget the possible simultaneous connections, not only the small count observed during a quiet interval. `CONN_MAX_AGE` controls connection lifetime; it is not a shared pool or a fleet-wide connection ceiling. [Django persistent connection caveats](https://docs.djangoproject.com/en/5.2/ref/databases/#caveats).

If several Django aliases connect to the same PostgreSQL server, add their demands. Background processes running in the same Pod need their own allowance. Use the production server's actual process and thread configuration; do not infer it from CPU requests.

## Budget the old and new replicas together

A steady-state calculation would permit `floor(300 / 20) = 15` replicas. That leaves no connection space for replacement Pods.

For rolling updates with `maxSurge: 25%`, define:

```text
R = desired replica ceiling
S = ceil(0.25 * R)
T = allowance for terminating Pods that still hold connections
peak API connections = (R + S + T) * 20
```

Kubernetes rounds percentage surge upward. Terminating Pods can continue consuming resources beyond the ordinary `replicas + maxSurge` population, so the surge setting alone does not bound live database clients. [Kubernetes Deployment behavior](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/).

For a conservative single replacement generation, allow the entire old generation to retain connections: `T = R`. Then:

```text
R = 6: (6 + 2 + 6) * 20 = 280 connections
R = 7: (7 + 2 + 7) * 20 = 320 connections
```

The example ceiling is six replicas. This reserve assumes one rollout generation at a time and no repeated scale-up/down cycles accumulating additional terminating Pods. Serialize releases, observe termination, and recompute the envelope if those assumptions cannot be maintained.

Calculate the ceiling directly:

```python
from math import ceil

budget = 300
per_replica = 20
allowed = [
    replicas for replicas in range(1, budget // per_replica + 1)
    if (2 * replicas + ceil(0.25 * replicas)) * per_replica <= budget
]
print(max(allowed, default=0))  # 6
```

Apply `maxReplicas: 6` in the API's HPA and align its Deployment with the modeled surge policy. Manual scaling and release tooling must honor the same ceiling; the HPA setting does not prevent another actor from changing replicas.

## Recalculate if using connection pools

With Django's psycopg pool integration, budget the maximum pool size for each process and database alias, then multiply by overlapping Pods. A pool inside each process is not one pool for the deployment. Use psycopg 3 with its pooling dependency for Django 5.2's `OPTIONS["pool"]` integration, and set `CONN_MAX_AGE = 0`: the backend rejects pooling combined with persistent connections. Do not rely on this pool option with psycopg2. ASGI deployments should also disable Django persistent connections and use an appropriate pooling strategy. [Django database and pool documentation](https://docs.djangoproject.com/en/5.2/ref/databases/) and [Django 5.2 PostgreSQL backend checks](https://github.com/django/django/blob/stable/5.2.x/django/db/backends/postgresql/base.py).

An external pooler introduces another boundary: many application connections can wait for a smaller number of PostgreSQL server connections. Budget both sides, include every pooler instance, and validate pool-mode compatibility and wait latency. More queued clients do not create more query capacity.

## Verify the maximum-scale rollout

Observe connections grouped by application and state:

```sql
SELECT application_name, usename, state, count(*) AS connections
FROM pg_stat_activity
WHERE backend_type = 'client backend'
GROUP BY application_name, usename, state
ORDER BY connections DESC;
```

Use an account with the visibility needed to inspect the relevant sessions. Set distinguishable application names for API and background clients. `pg_stat_activity` exposes one row per server process with connection and state information. [PostgreSQL activity statistics](https://www.postgresql.org/docs/current/monitoring-stats.html#MONITORING-PG-STAT-ACTIVITY-VIEW).

In staging, load the API to its configured ceiling and perform the modeled rollout. Track idle and active connections, acquisition wait, transaction duration, errors, and terminating Pods. Include a slow shutdown so the overlap is exercised. Check database CPU, I/O, and lock contention as well: fitting 300 connection slots proves a connection budget, not that 300 simultaneous queries are efficient.

If the resulting replica ceiling cannot meet demand, reduce per-replica connection concurrency, introduce a measured pooling design, optimize database work, or increase verified database capacity. Raising the HPA maximum alone transfers the overload to PostgreSQL.
