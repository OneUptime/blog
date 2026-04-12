# Validation Summary: How to Reconfigure a MongoDB Replica Set with rs.reconfig()

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB replica sets
- `rs.reconfig()` shell method
- Replica set configuration document (`rs.conf()`)
- Replica set member properties (priority, votes, hidden, secondaryDelaySecs)
- Forced reconfiguration (`force: true`)

## Sources Consulted
- MongoDB rs.reconfig() reference: https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB replica set configuration reference: https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB delayed replica set member tutorial: https://www.mongodb.com/docs/manual/tutorial/configure-a-delayed-replica-set-member/
- MongoDB hidden replica set member tutorial: https://www.mongodb.com/docs/manual/tutorial/configure-a-hidden-replica-set-member/

## Issues Found

1. **Common Errors table — votes/priority rule was reversed (line 199):** The table listed the error as `votes must be 0 when priority is 0`, implying that priority-0 members must have votes 0. This is incorrect. The actual MongoDB constraint is: non-voting members (`votes: 0`) must have `priority: 0`. Members with `priority: 0` can still have `votes: 1` (e.g., hidden members routinely have priority 0 and votes 1). Fixed the error message to `priority must be 0 when votes is 0` and updated the cause and fix accordingly.

2. **Force reconfig warning understated the risk (line 168):** The original text said a forced reconfig "can cause rollback of writes that were not yet replicated to the surviving members." The MongoDB documentation explicitly warns that force reconfig "can result in unexpected behavior, including rollback of majority committed write operations." This is a stronger risk than merely unreplicated writes. Updated to say "can cause rollback of even majority-committed writes."

## Review Notes
- The post's statement that "The version number in the config document is incremented by 1 on each successful reconfig" is a simplification. Starting with MongoDB 4.4+, the configuration uses both a `term` and `version` field to determine the newest config. The `term` matches the primary's election term. This is acceptable for a tutorial-level post but readers working with advanced replication scenarios should consult the full config reference.
- The `secondaryDelaySecs` field name is correct for MongoDB 5.0+. In older versions (pre-5.0), the field was called `slaveDelay`. The post does not specify a version, so readers on older MongoDB versions may need to use the legacy field name.
- All code examples use valid `mongosh` JavaScript syntax and follow correct patterns (fetching config with `rs.conf()`, modifying, then applying with `rs.reconfig()`).
