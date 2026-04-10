# How to Monitor Redis Sentinel Health

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Monitoring, Health, Observability

Description: Learn how to monitor Redis Sentinel health including quorum status, master state, replica lag, and Sentinel process availability for production alerting.

---

Redis Sentinel health monitoring goes beyond just checking if Redis is up. You need to verify the Sentinel cluster itself is healthy, the primary is reachable, replicas are synced, and quorum is maintained.

## Key Metrics to Monitor

```text
1. Sentinel process availability (all 3+ should be running)
2. Primary reachability from all Sentinels
3. Number of known Sentinels (quorum check)
4. Replica sync status and lag
5. Time since last failover
6. O-DOWN flags (active alerts)
```

## Checking Sentinel Process Health

```bash
# Ping each Sentinel
redis-cli -p 26379 PING
redis-cli -p 26380 PING
redis-cli -p 26381 PING
```

## Primary and Replica Status via SENTINEL

```bash
redis-cli -p 26379 SENTINEL masters
```

Key fields in the output:

```text
"flags"               -> should be "master" when healthy
                         watch for "s_down", "o_down", "disconnected"
"num-slaves"          -> number of known replicas
"num-other-sentinels" -> number of peer Sentinels (should be N-1)
"quorum"              -> configured quorum value
```

## Checking Replica Health

```bash
redis-cli -p 26379 SENTINEL replicas mymaster
```

Watch for these flags on replicas:

```text
"flags": "slave"                -> healthy
"flags": "slave,s_down"         -> replica unreachable from this Sentinel
"flags": "slave,disconnected"   -> Sentinel lost contact with replica
```

Also check:

```text
"master-link-status": "ok"      -> healthy replication
"slave-repl-offset"             -> should be close to primary's offset
"slave-priority"                -> 0 means never promote this replica
```

## Scripted Health Check

```bash
#!/bin/bash

SENTINEL_HOSTS=("sentinel-1:26379" "sentinel-2:26379" "sentinel-3:26379")
MASTER_NAME="mymaster"

for host in "${SENTINEL_HOSTS[@]}"; do
  H=$(echo $host | cut -d: -f1)
  P=$(echo $host | cut -d: -f2)

  STATUS=$(redis-cli -h $H -p $P SENTINEL master $MASTER_NAME 2>/dev/null | \
    awk '/^flags$/{getline; print}')

  if [[ "$STATUS" != "master" ]]; then
    echo "ALERT: Sentinel at $host reports master flags: $STATUS"
  else
    echo "OK: Sentinel at $host reports master healthy"
  fi
done
```

## Monitoring Sentinel with INFO

```bash
redis-cli -p 26379 INFO sentinel
```

Output:

```text
sentinel_masters:1
sentinel_tilt:0
sentinel_running_scripts:0
sentinel_scripts_queue_length:0
sentinel_simulate_failure_flags:0
master0:name=mymaster,status=ok,address=192.168.1.10:6379,slaves=2,sentinels=3
```

`sentinel_tilt:1` indicates the Sentinel entered TILT mode (time went backward or system was slow). During TILT, no failovers occur.

## Alert Conditions

Set up alerts for:

```text
- Any Sentinel reports master flags != "master"
- num-other-sentinels < (total_sentinels - 1)
- Any replica shows "s_down" or "disconnected" flags
- sentinel_tilt = 1
- master_link_status:down on any replica
```

## Integration with Monitoring Tools

Use OneUptime or Prometheus to scrape Sentinel status. The redis_exporter tool exposes Sentinel metrics:

```bash
redis_exporter --redis.addr redis://sentinel-1:26379
```

## Summary

Monitor Redis Sentinel health by checking each Sentinel's process, verifying master flags are clean via `SENTINEL masters`, inspecting replica flags with `SENTINEL replicas`, and watching for TILT mode. Automate these checks with scripted health probes and alert when quorum or replica availability drops.
