# How to Troubleshoot Redis Sentinel Not Detecting Failures

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Troubleshooting, Failover, Monitoring

Description: Learn how to diagnose why Redis Sentinel fails to detect primary failures, including quorum issues, network problems, and configuration mistakes.

---

When Redis Sentinel does not trigger failover after a primary goes down, the culprit is usually one of a few causes: lost quorum, network connectivity issues, misconfigured timeouts, or the Sentinel entering TILT mode. Here is how to diagnose each.

## Check 1 - Verify Sentinel PING Connectivity

Sentinels must be able to PING both each other and the Redis nodes:

```bash
# Can this Sentinel reach the primary?
redis-cli -h sentinel-1 -p 26379 SENTINEL masters
# Look for: "last-ping-sent" and "last-ok-ping-reply"

# Can Sentinels reach each other?
redis-cli -h sentinel-1 -p 26379 SENTINEL sentinels mymaster
# Each should have recent "last-ping-sent"
```

If Sentinels cannot reach each other, they cannot form a quorum.

## Check 2 - Quorum Is Not Met

```bash
redis-cli -p 26379 SENTINEL masters
```

Look for:

```text
"num-other-sentinels": "2"  -> 3 total, quorum=2: OK
"num-other-sentinels": "0"  -> only 1 Sentinel known, cannot reach quorum
```

Verify from the Sentinel perspective:

```bash
redis-cli -p 26379 INFO sentinel
# sentinel_masters:1
# master0:name=mymaster,status=ok,...,sentinels=1  <- only 1! problem!
```

If `sentinels=1`, the Sentinel is isolated. Check firewall rules between Sentinel hosts on port 26379.

## Check 3 - TILT Mode

TILT mode disables failovers:

```bash
redis-cli -p 26379 INFO sentinel | grep tilt
# sentinel_tilt:1  -> Sentinel is in TILT mode, no failovers!
```

TILT triggers when the system clock jumps or the Sentinel process was paused (e.g., VM migration, high load). It lasts 30 seconds by default.

```bash
# Wait for TILT to clear, or monitor for repeated TILT
watch -n 2 "redis-cli -p 26379 INFO sentinel | grep tilt"
```

## Check 4 - down-after-milliseconds Too High

If `down-after-milliseconds` is set very high, Sentinel waits a long time before acting:

```bash
redis-cli -p 26379 SENTINEL masters | grep down-after
# "down-after-milliseconds": "30000"  -> 30 seconds wait
```

Simulate the failure and wait longer than this value before expecting action.

## Check 5 - Firewall Blocking Sentinel-to-Redis

Sentinels need to connect to Redis on the standard Redis port (6379 by default):

```bash
# Test connectivity from Sentinel to primary
redis-cli -h primary-host -p 6379 PING
```

Also, Sentinels use a separate Pub/Sub channel on the Redis primary to discover each other. If Pub/Sub is blocked, Sentinels will not discover peers.

## Check 6 - Sentinel Config Mistakes

```bash
# Verify the monitored address is correct
redis-cli -p 26379 SENTINEL masters | grep -E "ip|port"

# Verify bind settings do not restrict Sentinel
cat /etc/redis/sentinel.conf | grep bind
# An overly restrictive bind prevents other Sentinels from connecting
```

## Reading Sentinel Logs

```bash
tail -100 /var/log/redis/sentinel-1.log
```

Look for:

```text
# Good - Sentinel is working
+sentinel ...
+slave ...

# Problems
+sdown without +odown  (quorum not reached, only one Sentinel sees the failure)
-odown ...  (ODOWN state cleared before failover completed)
TILT mode entered
```

## Force a Failover for Testing

If you suspect Sentinel is working but the primary is not really down, force a failover:

```bash
redis-cli -p 26379 SENTINEL failover mymaster
```

If this works, Sentinel is healthy. The original problem may have been the `down-after-milliseconds` timeout simply not elapsed yet.

## Summary

Redis Sentinel failure detection problems are most commonly caused by insufficient quorum (Sentinels cannot reach each other), TILT mode, overly high `down-after-milliseconds`, or firewall rules blocking connectivity. Diagnose by checking Sentinel INFO, verifying `num-other-sentinels`, and reviewing Sentinel logs for TILT or quorum messages.
