# How to Handle a ClickHouse Node Outage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Outage, Incident Response, Replication, High Availability

Description: Respond to a ClickHouse node outage with a structured runbook covering immediate triage, traffic failover, replica catch-up, and safe node recovery.

---

A ClickHouse node outage is disruptive but manageable when you have a runbook. With replicas in place, reads and writes continue; the main task is safe recovery without data divergence.

## Immediate Triage (First 5 Minutes)

```bash
# Check if the process is running
systemctl status clickhouse-server

# Check recent logs
journalctl -u clickhouse-server --since "10 minutes ago" | tail -50

# Ping the HTTP health endpoint
curl -s http://ch-node-02:8123/ping
```

If the process is down, attempt a restart:

```bash
systemctl restart clickhouse-server
```

## Check Replica Status from a Healthy Node

```sql
SELECT
    replica_path,
    is_readonly,
    is_session_expired,
    future_parts,
    queue_size,
    absolute_delay
FROM system.replicas
WHERE table IN ('events', 'metrics', 'logs');
```

If the failed node shows `absolute_delay > 0`, it will catch up automatically when it returns.

## Reroute Traffic

If the node won't restart quickly, remove it from the load balancer target group:

```bash
# AWS ALB
aws elbv2 deregister-targets \
  --target-group-arn arn:aws:... \
  --targets Id=i-0abc123,Port=8123
```

Remaining replicas take over reads automatically if `load_balancing` is set to `random` or `nearest_hostname`.

## Hardware Replacement

If the node needs replacement:
1. Provision a new node with identical ClickHouse version and config.
2. Add it to the cluster configuration with the same shard/replica paths.
3. Start ClickHouse - it will fetch missing parts from sibling replicas.

```sql
-- Monitor catch-up progress on the new node
SELECT
    table,
    queue_size,
    absolute_delay
FROM system.replicas
ORDER BY absolute_delay DESC;
```

## Verify Data Integrity After Recovery

```sql
-- Compare row counts across replicas
SELECT count() FROM events;  -- run on each node

-- Check for part differences
SELECT name, hash_of_all_files
FROM system.parts
WHERE table = 'events' AND active
ORDER BY name;
```

## Monitoring

Configure [OneUptime](https://oneuptime.com) to check `clickhouse-server` process health every 30 seconds on all nodes. Set a 2-minute alerting delay to avoid false alarms from restarts.

## Summary

Node outages in a replicated ClickHouse cluster are survivable: traffic fails over to healthy replicas, and the recovered node catches up automatically. The key actions are quick triage, load balancer update, and replication lag monitoring during catch-up.
