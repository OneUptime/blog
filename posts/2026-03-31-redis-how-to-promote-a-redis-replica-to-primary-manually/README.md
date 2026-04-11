# How to Promote a Redis Replica to Primary Manually

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Failover, High Availability, Operation

Description: A step-by-step guide to manually promoting a Redis replica to primary during planned maintenance or emergency failover scenarios.

---

## When to Manually Promote a Replica

Manual promotion is appropriate when:

- You are performing planned maintenance on the primary server
- The primary has failed and Redis Sentinel is not in use
- You need to migrate to a new primary server
- Testing failover procedures

If you are using Redis Sentinel or Redis Cluster, prefer their built-in failover mechanisms. Manual promotion is for standalone or unmanaged setups.

## Pre-Promotion Checklist

Before promoting a replica, confirm:

1. The replica is fully caught up with the primary
2. No other writes are in-flight to the primary
3. You have a plan for redirecting clients to the new primary

## Step 1 - Stop Writes to the Primary

If the primary is still accessible, stop new writes. One way is to set an impossibly high minimum replica count so the primary rejects all writes:

```bash
redis-cli -h primary-host CONFIG SET min-replicas-to-write 99
```

This causes the primary to return errors on write commands because the replica threshold cannot be met. For better control, use a client-side circuit breaker or maintenance page to halt writes before this step.

## Step 2 - Verify the Replica Is Caught Up

On the replica, check `INFO replication`:

```bash
redis-cli -h replica-host INFO replication
```

Look for:

```text
master_link_status:up
slave_repl_offset:500000
```

On the primary, verify the offset matches:

```bash
redis-cli -h primary-host INFO replication | grep master_repl_offset
```

Output:

```text
master_repl_offset:500000
```

When `slave_repl_offset == master_repl_offset`, the replica is fully caught up.

## Step 3 - Promote the Replica

Issue `REPLICAOF NO ONE` on the replica to detach it from the primary:

```bash
redis-cli -h replica-host REPLICAOF NO ONE
```

The replica immediately becomes an independent primary. It stops receiving replication data from the old primary.

Confirm:

```bash
redis-cli -h replica-host INFO replication
```

Expected output:

```text
role:master
connected_slaves:0
master_replid:newreplid123...
master_repl_offset:500000
```

## Step 4 - Redirect Clients to the New Primary

Update your application configuration, load balancer, or DNS record to point to the new primary server. This varies by your infrastructure:

```bash
# Example: Update HAProxy config and reload
sed -i 's/old-primary-host/new-primary-host/' /etc/haproxy/haproxy.cfg
systemctl reload haproxy
```

Or update your application config:

```text
REDIS_PRIMARY_HOST=new-primary-host
REDIS_PRIMARY_PORT=6379
```

## Step 5 - Attach Old Primary as a Replica (Optional)

If the old primary is still running and you want it to become a replica of the new primary:

```bash
redis-cli -h old-primary-host REPLICAOF new-primary-host 6379
```

This triggers a full or partial resync from the new primary to the old one.

## Handling a Failed Primary

If the primary is unreachable (crash, network failure):

1. Skip Step 1 (primary is already down)
2. Check replica lag - pick the most up-to-date replica:

```bash
for HOST in replica1 replica2 replica3; do
  echo -n "$HOST offset: "
  redis-cli -h $HOST INFO replication | grep slave_repl_offset
done
```

3. Promote the replica with the highest offset:

```bash
redis-cli -h replica1 REPLICAOF NO ONE
```

4. Redirect clients
5. Re-attach other replicas to the new primary

## Risk of Data Loss During Unplanned Failover

If the primary crashed before the replica received all writes, the promoted replica will be missing those writes. There is no way to recover them unless the original primary's disk is still accessible.

To minimize this risk in the future:

- Use `WAIT 1 1000` in your application for critical writes
- Keep a short replication backlog window with fast replicas
- Consider Redis Sentinel for automatic failover with quorum

## Verifying After Promotion

Test that writes work on the new primary:

```bash
redis-cli -h new-primary-host SET test "promotion-ok"
redis-cli -h new-primary-host GET test
```

Verify any other replicas have re-synced:

```bash
redis-cli -h new-primary-host INFO replication | grep slave
```

## Summary

Manual Redis replica promotion involves stopping writes to the old primary, verifying replica offset parity, issuing `REPLICAOF NO ONE` on the chosen replica, and redirecting clients. For planned maintenance, always verify offset parity before promoting to avoid data loss. For unplanned failovers, choose the replica with the highest offset and be aware that some writes may have been lost. Automate this process with Redis Sentinel if your availability requirements demand fast, automatic failover.
