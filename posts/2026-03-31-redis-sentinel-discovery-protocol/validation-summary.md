# Validation Summary: How Redis Sentinel Discovery Protocol Works

## Status
validated

## Post Type
Technical explainer / Reference guide

## Technologies Covered
- Redis Sentinel
- Redis Pub/Sub (used for Sentinel peer discovery)
- Redis replication (INFO command for replica discovery)
- Raft-like consensus (leader election for failover)

## Sources Consulted
- Redis Sentinel official documentation: https://redis.io/docs/latest/operate/oss_and_stack/management/sentinel/
- Redis Sentinel source code behavior for hello message publishing and failover propagation
- Redis CLI SENTINEL command reference: https://redis.io/docs/latest/commands/sentinel/

## Issues Found

### Issue 1: Hello message publishing scope (line 35)
- **What was wrong:** The post stated Sentinels publish hello messages "on the primary" only, but earlier correctly stated they subscribe "on every monitored primary and replica." This was inconsistent and inaccurate.
- **What was changed:** Changed "publishes a hello message to this channel on the primary" to "publishes a hello message to this channel on every monitored primary and replica."
- **Why:** Per Redis Sentinel documentation, Sentinels publish hello messages to every monitored master and replica every two seconds, not just the primary.

### Issue 2: Failover step 3 — configuration propagation mechanism (line 88)
- **What was wrong:** Step 3 stated "Leader sends SENTINEL set mymaster to other Sentinels with new primary address." This is inaccurate — there is no `SENTINEL set` command sent between Sentinels during failover. `SENTINEL set` is a manual administrative command, not part of the automated failover protocol.
- **What was changed:** Replaced with "Other Sentinels learn the new primary via Pub/Sub hello messages with the updated config epoch."
- **Why:** During failover, the leader updates its own configuration with the new primary address and a higher config epoch. Other Sentinels discover the change through the regular Pub/Sub hello messages on the `__sentinel__:hello` channel, which carry the updated master IP/port and config epoch. Sentinels accept the new configuration when they see a higher config epoch.

## Review Notes
- The post uses `INFO replication` when describing replica discovery. Technically, Sentinel sends `INFO` (all sections) every 10 seconds, not `INFO replication` specifically. However, the replication section is the relevant output for replica discovery, and this is a reasonable pedagogical simplification that does not mislead the reader.
- The `SENTINEL slaves` command shown in the monitoring section still works but has been aliased to `SENTINEL replicas` in Redis 5.0+. Both are valid; the post uses the older form which remains functional.
- The overall architecture description (Pub/Sub discovery, SDOWN/ODOWN escalation, Raft-like leader election, failover steps) is accurate and well-structured.
