# Validation Summary: How to Force a Replica Set Member to Become Primary in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (replica sets, elections, failover)
- mongosh (MongoDB Shell)
- Replica set configuration (`rs.conf()`, `rs.reconfig()`)
- Replica set administration (`rs.stepDown()`, `rs.freeze()`)

## Sources Consulted
- MongoDB Manual: rs.reconfig() — https://www.mongodb.com/docs/manual/reference/method/rs.reconfig/
- MongoDB Manual: rs.stepDown() — https://www.mongodb.com/docs/manual/reference/method/rs.stepDown/
- MongoDB Manual: rs.freeze() — https://www.mongodb.com/docs/manual/reference/method/rs.freeze/
- MongoDB Manual: Replica Set Configuration (settings.catchUpTimeoutMillis) — https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.settings.catchUpTimeoutMillis
- MongoDB Manual: db.hello() — https://www.mongodb.com/docs/manual/reference/method/db.hello/
- MongoDB Manual: Force a Member to Become Primary — https://www.mongodb.com/docs/manual/tutorial/force-member-to-be-primary/

## Issues Found
1. **Incorrect setting name in description text (line 77)**: The text referred to `catchUpPeriodMillis` but the correct replica set configuration field name is `catchUpTimeoutMillis`. The code example on the following line already used the correct name. Fixed the description text to match.

2. **Deprecated API usage (line 47)**: `rs.isMaster()` has been deprecated since MongoDB 5.0 in favor of the `hello` command. Replaced `rs.isMaster().primary` with `db.hello().primary`, which returns the same primary host string.

3. **Misleading `priority: undefined` in rs.status() mapping (line 20)**: The first code example explicitly set `priority: undefined` in the mapped output from `rs.status()`, which is misleading since `rs.status()` does not contain priority information. Removed the `priority: undefined` field from the mapping since the next line correctly retrieves priority from `rs.conf()`.

## Review Notes
- The overall approach described (priority manipulation + stepDown, and the freeze alternative) aligns with MongoDB's official documentation on forcing a member to become primary.
- The `rs.printSecondaryReplicationInfo()` method is valid in mongosh but users should be aware that in older documentation this was called `rs.printSlaveReplicationInfo()`.
- The emergency `force: true` reconfig is correctly documented as a last resort. The post appropriately warns about the risks.
- The `catchUpTimeoutMillis` setting defaults to -1 (infinite catch-up time) in MongoDB 3.6+. The post's example of setting it to 10000ms is reasonable for demonstration but users should understand the implications of limiting catch-up time.
