# How Redis Handles Key Expiration in Replicas

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Replication, Expiration

Description: Understand how key expiration works differently on Redis replicas vs primaries - why replicas can serve stale expired data and how to reason about consistency.

---

Key expiration on Redis replicas works differently from the primary. Replicas do not independently expire keys. Instead, they wait for expiration signals from the primary. This design has important implications for read consistency and capacity planning.

## Primary-Driven Expiration Model

Redis follows a primary-driven expiration model. When a key expires on the primary (via lazy or active expiration), the primary sends a `DEL` command to all replicas. Replicas delete the key upon receiving this command.

This means:
- Replicas never independently decide to delete a key
- Before Redis 3.2, expired keys on replicas remained readable until the primary sent DEL. Since 3.2, replicas return nil for logically expired keys
- The delay between expiration and DEL delivery depends on network latency and replication lag

## Why Replicas Can Serve Stale Data

If a key expires at time T:
1. Client reads the key from a replica at T+1
2. The primary has not yet lazy-expired the key (no read on primary)
3. Active expiration cycle has not yet picked up the key
4. The replica still returns the value

```bash
# On primary: key expires
redis-cli -h primary SET mykey "value" PX 5000
# After 5 seconds...

# On replica (before Redis 3.2): key may still be returned
redis-cli -h replica GET mykey  # Returns "value" on Redis < 3.2, nil on Redis >= 3.2
```

## Checking Expiration on Replicas

You can check TTL on a replica and it will report the remaining time (negative if expired but not yet deleted):

```bash
redis-cli -h replica TTL mykey
# Returns: -2 if the key does not exist, -1 if no expiry is set, or a positive number for remaining TTL
```

Note: Since Redis 3.2, the replica uses its local clock to determine if a key has logically expired. For expired-but-not-yet-deleted keys, `TTL` returns `-2` (treating the key as non-existent) rather than reporting the remaining time. The `TTL` command only returns `-2`, `-1`, or a positive integer - it never returns arbitrary negative values.

## Replica Expiration Logic Change in Redis 3.2

Before Redis 3.2, replicas would always serve expired keys without filtering. Since Redis 3.2, replicas use their own clock to check if a key has logically expired when responding to client reads. Even if the DEL has not arrived from the primary yet, the replica will return nil for logically expired keys.

```bash
redis-cli INFO server | grep "redis_version"
```

## Implications for Read Workloads

If your application reads exclusively from replicas with `replica-serve-stale-data no`, replicas will return errors when they have lost connection to the primary or during initial synchronization:

```bash
redis-cli CONFIG GET replica-serve-stale-data
```

Setting `replica-serve-stale-data no` causes replicas to return errors when the link to the primary is down or replication is still in progress. This does not apply during normal connected replication with minor lag.

## Monitoring Expiration Propagation

Monitor expired_keys on both primary and replica:

```bash
redis-cli -h primary INFO stats | grep expired_keys
redis-cli -h replica INFO stats | grep expired_keys
```

If the replica's `expired_keys` count lags far behind the primary, replication is behind.

## Summary

Redis replicas do not expire keys independently. They wait for DEL propagation from the primary after the primary expires a key through lazy or active expiration. Since Redis 3.2, replicas use their local clock to return nil for logically expired keys, but physical deletion still depends on the primary sending DEL commands.
