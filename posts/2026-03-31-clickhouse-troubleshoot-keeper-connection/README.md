# How to Troubleshoot ClickHouse Keeper Connection Issues

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, ClickHouse Keeper, Troubleshooting, Connection, ZooKeeper, Replication

Description: Diagnose and fix ClickHouse Keeper connection issues including session timeouts, refused connections, and replication stalls caused by Keeper problems.

---

ClickHouse Keeper connection problems stop replication and distributed DDL dead in their tracks. This guide walks through diagnosing the most common Keeper connection failures.

## Symptoms of Keeper Connection Issues

- Replicated table inserts return "Session expired" or "Connection refused" errors
- `system.replicas` shows tables in read-only mode (`is_readonly = 1`)
- `system.zookeeper_connection` shows failed or disconnected state
- Distributed DDL tasks hang indefinitely

## Step 1: Check Keeper Process Status

```bash
sudo systemctl status clickhouse-keeper
```

If the service is stopped or failed, check the logs:

```bash
sudo journalctl -u clickhouse-keeper -n 100 --no-pager
```

## Step 2: Test Network Connectivity

From the ClickHouse server, test connectivity to each Keeper node:

```bash
echo ruok | nc keeper1 9181
echo ruok | nc keeper2 9181
echo ruok | nc keeper3 9181
```

If any node returns nothing or times out, check firewall rules:

```bash
sudo iptables -L INPUT -n | grep 9181
# Or on systems using firewalld:
sudo firewall-cmd --list-ports
```

## Step 3: Check ClickHouse Keeper Connection State

```sql
SELECT *
FROM system.zookeeper_connection;
```

Fields to check:

- `is_expired`: should be `0`
- `session_uptime_elapsed_seconds`: should be growing
- `connected_time`: shows when the connection was established

## Step 4: Check for Expired Sessions in Keeper Logs

```bash
grep -i "session expired\|connection refused\|timeout" /var/log/clickhouse-server/clickhouse-server.err.log | tail -50
```

Session expirations indicate the ClickHouse server could not reach Keeper for longer than `session_timeout_ms`.

## Step 5: Verify Keeper Has Quorum

```bash
echo stat | nc keeper1 9181 | grep "Mode"
```

If all nodes show `Mode: follower` with no leader, Raft quorum is lost. This happens when more than half the Keeper nodes are unreachable.

## Step 6: Check Keeper Is Responding to Reads

```bash
clickhouse-keeper-client -h keeper1 -p 9181 -q "ls '/'"
# Should return: clickhouse zookeeper
```

## Fix: Increase Session and Operation Timeouts

If your network has high latency or packet loss:

```xml
<coordination_settings>
  <operation_timeout_ms>30000</operation_timeout_ms>
  <session_timeout_ms>60000</session_timeout_ms>
</coordination_settings>
```

On the ClickHouse server side:

```xml
<zookeeper>
  <session_timeout_ms>60000</session_timeout_ms>
  <operation_timeout_ms>30000</operation_timeout_ms>
</zookeeper>
```

## Fix: Tables Stuck in Read-Only Mode

After Keeper recovers, force ClickHouse to re-establish connections:

```sql
SYSTEM RESTART REPLICA db.events_local;
```

Or restart ClickHouse server if multiple tables are affected.

## Summary

Troubleshooting Keeper connection issues starts with verifying the Keeper service is running and reachable via TCP, checking that Raft quorum is healthy, and reviewing session timeout errors in logs. Increase timeout settings for high-latency environments and use `SYSTEM RESTART REPLICA` to recover tables stuck in read-only mode after Keeper is restored.
