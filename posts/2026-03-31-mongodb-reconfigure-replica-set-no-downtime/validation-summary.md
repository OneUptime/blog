# Validation Summary: How to Reconfigure a Replica Set Without Downtime in MongoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (replica set configuration)
- `rs.reconfig()`, `rs.conf()`, `rs.status()` shell methods
- Replica set member settings (`priority`, `hidden`, `votes`, `secondaryDelaySecs`, `tags`)
- Replica set global settings (`electionTimeoutMillis`, `heartbeatIntervalMillis`, `chainingAllowed`)

## Sources Consulted
- MongoDB official documentation: rs.reconfig() — https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB official documentation: Replica Set Configuration — https://www.mongodb.com/docs/manual/reference/replica-configuration/
- MongoDB official documentation: Reconfigure a Replica Set with Unavailable Members — https://www.mongodb.com/docs/manual/tutorial/reconfigure-replica-set-with-unavailable-members/
- MongoDB official documentation: Replica Set Elections — https://www.mongodb.com/docs/manual/core/replica-set-elections/
- MongoDB official documentation: Hidden Replica Set Members — https://www.mongodb.com/docs/manual/core/replica-set-hidden-member/

## Issues Found

1. **`votes` incorrectly listed as not causing an election**: The original post listed `votes` alongside `hidden`, `tags`, and `secondaryDelaySecs` as changes that do NOT cause an election. However, changing `votes` on a member alters the voting topology and quorum calculation, which can trigger an election or primary step-down. Moved `votes` to the "Changes That May Cause an Election" section.

2. **`priority` change for non-primary was oversimplified**: The post stated that updating `priority` of a non-primary member does not cause an election, without qualification. This is only true if the new priority does not exceed the current primary's priority. If a secondary's priority is raised above the primary's, MongoDB will trigger an election to ensure the highest-priority available member becomes primary. Added the qualification and a corresponding entry in the "May Cause" section.

3. **Missing election triggers for adding/removing voting members**: The "Changes That May Cause an Election" section only listed priority-related triggers. Adding or removing voting members changes the quorum calculation and can also trigger elections. Added these as explicit items.

4. **`heartbeatIntervalMillis = 2000` was a no-op**: The example set `heartbeatIntervalMillis` to 2000, which is already the default value, making the configuration change meaningless. Changed the example value to 1000 to demonstrate an actual configuration change.

## Review Notes
- The `heartbeatIntervalMillis` setting is documented as "Internal use only" in some MongoDB documentation versions, though it remains configurable via the replica set configuration. Users should be aware of this.
- The post correctly notes the one-at-a-time constraint implicitly (separate add/remove examples), but does not explicitly mention that MongoDB enforces a limit of adding or removing no more than one voting member per reconfig operation. This is worth knowing for production use.
- The `force: true` section correctly warns about split-brain risks and the large version jump behavior.
- Hidden member requiring priority 0 is correctly documented.
- All code examples use valid `mongosh` / mongo shell JavaScript syntax.
