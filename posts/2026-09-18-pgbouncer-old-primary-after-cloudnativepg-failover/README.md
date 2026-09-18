# PgBouncer Still Points to the Old Primary After Operator Failover: DNS, Pool, and Reconnect Fixes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: CloudNativePG, PostgreSQL, PgBouncer, DNS, Failover

Description: Trace stale PostgreSQL connections through CloudNativePG Services, PgBouncer DNS caching, and backend connection reuse after failover.

---

After failover, new PostgreSQL connections may succeed while one application keeps reporting read-only transactions. That is a useful clue: the cluster may have promoted correctly, but the application or PgBouncer still holds connections to the former primary.

Debug the route in layers. A hostname, a Kubernetes Service, and an established TCP connection have different lifetimes. Lowering a DNS cache timeout does not necessarily change where an existing connection goes.

The examples use CloudNativePG 1.30, cluster `orders`, namespace `database`, and a managed Pooler named `orders-pooler`. For another operator, establish its equivalent primary Service and configuration ownership before applying changes.

## Prove the database roles

Start with the operator's view:

```bash
kubectl cnpg status orders -n database
kubectl get pods -n database -l cnpg.io/cluster=orders -o wide
kubectl get service orders-rw -n database -o yaml
kubectl get endpointslices -n database \
  -l kubernetes.io/service-name=orders-rw -o yaml
```

From both the failing application path and a fresh direct connection to the write Service, run:

```sql
SELECT inet_server_addr(), pg_is_in_recovery(),
       current_setting('transaction_read_only');
```

A true recovery flag identifies a standby. A read-only transaction setting with recovery false can instead come from session, role, or database configuration. Record the returned server address and compare it with the pod addresses.

CloudNativePG's [Service management documentation](https://cloudnative-pg.io/docs/1.30/service_management/) defines `-rw` for the primary and `-ro` for replicas. A write pooler accidentally configured with `type: ro` has a routing configuration problem; reconnecting repeatedly will not fix it.

## Inspect what the pooler actually targets

Check the managed resource:

```bash
kubectl get pooler orders-pooler -n database -o yaml
kubectl get pods -n database -l cnpg.io/poolerName=orders-pooler
```

In a CloudNativePG-managed Pooler, verify `spec.cluster.name` and `spec.type`. The operator generates the database mappings. Make persistent changes through the `Pooler` resource rather than editing a generated configuration file that reconciliation can replace. See the operator's [controlled configurability](https://cloudnative-pg.io/docs/1.30/connection_pooling/#controlled-configurability).

For a separately managed PgBouncer, inspect the `[databases]` entry. A pod IP, pod hostname, old primary address, or read-only Service is not an appropriate write destination. Change the durable configuration to the intended primary endpoint, then reload it using the administration interface.

Use an authorized administrative connection to each PgBouncer instance. For a CloudNativePG-managed Pooler, the default administration interface accepts local peer-authenticated connections as the `pgbouncer` operating-system user; use approved per-pod local-socket access, not application credentials through the Service. This restriction is documented under [pooler security](https://cloudnative-pg.io/docs/1.30/connection_pooling/#security).

```sql
SHOW DATABASES;
SHOW SERVERS;
SHOW POOLS;
SHOW CONFIG;
```

The admin console uses the virtual `pgbouncer` database; these commands are not normal PostgreSQL SQL. Avoid putting credentials in shell history. For independently managed poolers with remote administration enabled, a Service in front of several instances does not guarantee successive admin commands reach the same process.

## Decide whether DNS is involved

With a standard ClusterIP Service, `orders-rw.database.svc` normally resolves to the Service IP. Failover changes its ready endpoints while the Service IP stays the same. In that topology a DNS answer can be correct while an established connection still reaches the old backend.

DNS matters when your design changes the hostname's resolved address, such as an external endpoint or a headless Service. Compare resolution from the pooler's network environment, the configured destination, and the addresses shown by `SHOW SERVERS`.

PgBouncer's [`dns_max_ttl`](https://www.pgbouncer.org/config.html#dns_max_ttl) controls its own cache and does not honor the authoritative record's TTL as a replacement. When resolution changes, PgBouncer retires old server connections when they are released according to pool mode. A long-lived session can therefore delay convergence even after DNS refreshes.

## Recycle connections at the correct boundary

When a downstream Service changed its destination but PgBouncer's connection string stayed the same, the admin command below requests backend recycling for database `app`:

```sql
RECONNECT app;
SHOW SERVERS;
WAIT_CLOSE app;
```

[`RECONNECT` and `WAIT_CLOSE`](https://www.pgbouncer.org/usage.html#reconnect-db) do not migrate in-flight transactions. `RECONNECT` closes connections after release; `WAIT_CLOSE` waits for connections marked for closure. It can wait a long time for session pooling. During convergence, old and new backend connections can coexist.

For a planned change that requires all connections to move together, use a coordinated `PAUSE`, verify the drain, change or verify the destination, and `RESUME`. CloudNativePG exposes that through `spec.pgbouncer.paused`. For an unplanned outage, applications still need bounded reconnects and correct handling of ambiguous commits.

Do not restart every pooler pod as the first diagnostic action. That removes evidence and disconnects clients across the fleet. If a targeted restart becomes necessary, use the deployment's maintenance procedure and observe its effects before moving to another instance.

## Confirm every path converged

Repeat the role query through each pooler and the application. Confirm fresh writes succeed, no pooler retains unintended old-primary server connections, and the former primary is a healthy standby. Check client-side pools as well: a fresh command-line connection does not exercise an application's established session.

Record whether the fault was incorrect routing, stale backend reuse, delayed DNS refresh, or a read-only session setting. Each requires a different preventive measure, and only the relevant one belongs in the failover runbook.
