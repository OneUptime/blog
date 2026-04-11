# How to Troubleshoot Redis Sentinel Failover Not Triggering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Sentinel, Failover, High Availability, Troubleshooting

Description: Fix Redis Sentinel failover not triggering by checking quorum, down-after-milliseconds settings, Sentinel network connectivity, and auth configuration.

---

## How Sentinel Failover Works

Redis Sentinel monitors primaries and replicas. When a primary is unreachable, a Sentinel marks it as SDOWN (subjectively down). Once enough Sentinels agree (quorum), the primary is marked ODOWN (objectively down) and a leader Sentinel performs the failover, promoting a replica.

Failover can fail to trigger for several reasons:

- Not enough Sentinels agree (quorum not met)
- Sentinels cannot reach each other
- `down-after-milliseconds` is set too high
- Authentication mismatch between Sentinel and Redis
- No eligible replica available

## Step 1 - Check Sentinel Status

```bash
redis-cli -h <sentinel-host> -p 26379 SENTINEL masters
```

Look at `flags` and `num-other-sentinels`:

```text
 1) "name"
 2) "mymaster"
 3) "ip"
 4) "192.168.1.10"
 ...
15) "flags"
16) "s_down,master"
17) "num-other-sentinels"
18) "1"
19) "quorum"
20) "2"
```

`s_down` means this Sentinel thinks the primary is down. If `num-other-sentinels` is less than `quorum - 1`, failover will not trigger because there are not enough Sentinels to form a quorum.

## Step 2 - Check Quorum Configuration

```bash
redis-cli -h <sentinel-host> -p 26379 SENTINEL ckquorum mymaster
```

A healthy quorum check returns:

```text
OK 3 usable Sentinels. Quorum and failover authorization can be reached
```

A failed check:

```text
NOQUORUM 1 usable Sentinels. Not enough available Sentinels to reach the specified quorum for this master
```

## Step 3 - Verify Sentinels Can Reach Each Other

Sentinels communicate via the monitored Redis primary. If they cannot see each other:

```bash
# On each Sentinel, check which others are known
redis-cli -h sentinel1 -p 26379 SENTINEL sentinels mymaster
```

If a Sentinel is missing from the list, it cannot be reached. Check firewall rules between all Sentinel hosts on port 26379.

## Step 4 - Check down-after-milliseconds

The `down-after-milliseconds` setting controls how long a primary must be unreachable before a Sentinel marks it SDOWN. If this is set too high (e.g., 30000ms = 30 seconds), failover appears slow.

```bash
redis-cli -h <sentinel-host> -p 26379 SENTINEL master mymaster | grep -A1 down-after
```

Or in `sentinel.conf`:

```text
sentinel down-after-milliseconds mymaster 5000
```

A value of 5000ms (5 seconds) is a common production setting. Reduce for faster detection:

```bash
redis-cli -h <sentinel-host> -p 26379 SENTINEL SET mymaster down-after-milliseconds 3000
```

## Step 5 - Check Sentinel Authentication

If Redis requires authentication, Sentinels must also be configured with the password:

```bash
grep auth-pass /etc/redis/sentinel.conf
```

Expected:

```text
sentinel auth-pass mymaster mysecretpassword
```

In Redis 6.0+ with ACL, also set the username:

```text
sentinel auth-user mymaster sentinel-user
sentinel auth-pass mymaster sentinel-password
```

If auth is missing or wrong, Sentinels will not be able to monitor or failover the primary.

## Step 6 - Check for Eligible Replicas

Sentinel will not promote a replica that appears too far behind. Check replica lag:

```bash
redis-cli -h <sentinel-host> -p 26379 SENTINEL replicas mymaster
```

Look at `slave-repl-offset` to compare how far behind each replica is. Also check `flags` - a replica flagged `disconnected` or `s_down` is not eligible. Check `master-link-status` to confirm each replica is connected to the primary.

Sentinel selects the best replica for promotion based on `replica-priority` (lowest non-zero value wins), then replication offset, then run ID. To prevent a specific replica from ever being promoted, set its priority to 0 on the replica itself:

```text
# In redis.conf on the replica
replica-priority 0
```

## Step 7 - Force a Manual Failover for Testing

To test that Sentinel failover works (e.g., in a staging environment):

```bash
redis-cli -h <sentinel-host> -p 26379 SENTINEL FAILOVER mymaster
```

Then watch:

```bash
redis-cli -h <sentinel-host> -p 26379 SENTINEL masters | grep -E 'name|ip|flags'
```

## Step 8 - Review Sentinel Logs

```bash
tail -200 /var/log/redis/sentinel.log | grep -iE 'failover|odown|sdown|error'
```

Common useful log messages:

```text
+sdown master mymaster 192.168.1.10 6379          # This Sentinel detected primary down
+odown master mymaster 192.168.1.10 6379 #quorum  # Quorum reached
+failover-state-send-slaveof-noone slave ...       # Promoting replica
+promoted-slave slave 192.168.1.11:6379 ...        # Failover complete
-failover-abort-no-good-slave master ...           # No eligible replica
```

## Summary

Sentinel failover failures are most commonly caused by quorum not being met (too few Sentinels running or reachable), `down-after-milliseconds` set too high, or authentication mismatches between Sentinel and the Redis primary. Use `SENTINEL ckquorum` to verify quorum is achievable, check Sentinel logs for detailed state transitions, and test failover regularly with `SENTINEL FAILOVER` in non-production environments.
