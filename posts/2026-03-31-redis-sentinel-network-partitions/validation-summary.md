# Validation Summary: How Redis Sentinel Handles Network Partitions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Redis Sentinel
- Redis replication (`min-replicas-to-write`, `min-replicas-max-lag`)
- Redis CLI (`redis-cli`, `INFO`, `SENTINEL` subcommands)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis replication configuration reference (for `min-replicas-to-write` / `min-replicas-max-lag` directives)

## Issues Found

### 1. Scenario C incorrectly claimed failover would be initiated
**What was wrong:** Scenario C described the partition `[S1, S2, Primary] | [S3, Replicas]` and claimed "S1+S2 can form quorum, may initiate failover." This is incorrect because S1 and S2 are on the same side as the Primary — they can reach it and would not mark it as S-DOWN, so no failover would be triggered.
**What was changed:** Updated the description to state that S1+S2 can reach the Primary so no failover is triggered, and that replicas are cut off causing replication to stall.

### 2. Majority partition failover analysis was misleading
**What was wrong:** In the "What Quorum Guarantees" section, the majority partition analysis (`[S1, S2] | [S3, Primary, Replicas]`) stated "Failover initiated on a replica in [S3, Replicas] partition" and "S3 is in the wrong partition! Failover may fail or elect incorrectly." The actual issue is that the elected leader (S1 or S2) cannot reach any replica on the other side of the partition to promote it, so the failover attempt simply fails.
**What was changed:** Updated to explain that a leader is elected (S1 or S2) but cannot reach any replica to promote, so the failover fails.

### 3. Partition healing process incorrectly described self-demotion
**What was wrong:** The healing process stated the old primary "discovers a new primary exists" and "demotes itself." According to Redis Sentinel documentation, Sentinels actively reconfigure the old primary — they detect it is back online and send the REPLICAOF command to it. The old primary does not self-discover or self-demote.
**What was changed:** Updated steps 2 and 3 to correctly state that Sentinels detect the old primary and send the REPLICAOF command to it.

### 4. Stale writes explanation was contradictory
**What was wrong:** The sentence "After the partition heals, writes made after this threshold are lost" was contradictory — the primary stops accepting writes after the threshold, so there are no writes "after" it. The intended meaning is that writes accepted during the brief window before the protection activates (up to 10 seconds) will be lost.
**What was changed:** Reworded to clarify that writes accepted on the isolated primary before the protection kicks in (up to 10 seconds) will be lost when the old primary becomes a replica.

## Review Notes
- All CLI commands (`SENTINEL replicas`, `SENTINEL masters`, `INFO sentinel`, `INFO replication`) are correct and use current (non-deprecated) syntax.
- The `sentinel_tilt:1` field name in the INFO sentinel output is correct per official documentation.
- The `min-replicas-to-write` and `min-replicas-max-lag` directives use the current naming convention (replacing the deprecated `min-slaves-*` forms).
- TILT mode duration of 30 seconds is confirmed correct.
- The post could benefit from mentioning that without `min-replicas-to-write` protection, ALL writes during the entire partition duration (not just 10 seconds) would be lost, to better motivate why the configuration is important.
