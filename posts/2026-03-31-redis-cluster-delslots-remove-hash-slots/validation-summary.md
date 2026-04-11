# Validation Summary: How to Use CLUSTER DELSLOTS in Redis to Remove Hash Slots

## Status
validated

## Post Type
Tutorial / Reference

## Technologies Covered
- Redis (Cluster mode)
- Redis CLI
- CLUSTER DELSLOTS command
- CLUSTER DELSLOTSRANGE command (Redis 7.0+)
- CLUSTER SETSLOT (MIGRATING subcommand)
- CLUSTER SHARDS / CLUSTER SLOTS

## Sources Consulted
- Official Redis documentation for CLUSTER DELSLOTS: https://redis.io/docs/latest/commands/cluster-delslots/
- Official Redis documentation for CLUSTER DELSLOTSRANGE: https://redis.io/docs/latest/commands/cluster-delslotsrange/
- Official Redis documentation for CLUSTER SLOTS: https://redis.io/docs/latest/commands/cluster-slots/
- Official Redis documentation for CLUSTER SETSLOT: https://redis.io/docs/latest/commands/cluster-setslot/
- Official Redis documentation for CLUSTER SHARDS: https://redis.io/docs/latest/commands/cluster-shards/

## Issues Found

1. **Incorrect error message**: The blog showed `(error) ERR Slot 9999 is not assigned to me` but the actual Redis error for an unbound slot is `(error) ERR Slot 9999 is already unbound`. Fixed the error message to match actual Redis behavior.

2. **Misleading error case description**: The blog stated the error occurs when a slot is "not assigned to the node," implying DELSLOTS only works on self-owned slots. In reality, DELSLOTS clears the node's knowledge of which master serves the slot, and the error occurs when the slot is already unbound (not assigned to any node). Fixed the description to accurately reflect this.

3. **Incorrect MIGRATING state error claim**: The blog claimed that running DELSLOTS on a slot in MIGRATING state returns an error. This is not documented in the official Redis docs. A slot in MIGRATING state is still associated with a node, so DELSLOTS should work on it. Replaced this incorrect claim with the actual documented error case: specifying the same slot more than once in a single command.

4. **CLUSTER SLOTS deprecated**: The blog used `CLUSTER SLOTS` for verification without noting it was deprecated in Redis 7.0.0. Replaced with `CLUSTER SHARDS` and added a deprecation note, since the post already references Redis 7.0+ features (DELSLOTSRANGE).

## Review Notes
- The migration example in the "Warning - Data Loss Risk" section is intentionally simplified to illustrate the point about migrating data before using DELSLOTS. A complete migration procedure would also involve CLUSTER SETSLOT IMPORTING on the destination node and using MIGRATE for each key, followed by CLUSTER SETSLOT NODE. This is acceptable in context since the post is about DELSLOTS, not migration procedures.
- The post correctly notes that CLUSTER DELSLOTSRANGE was introduced in Redis 7.0+.
- The post could mention that DELSLOTS changes can be overridden by cluster gossip — if another node still claims ownership with a higher config epoch, the slot mapping may be re-established. This is documented behavior but not critical for the tutorial's scope.
