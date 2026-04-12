# Validation Summary: How to Stop and Start the Balancer in MongoDB

## Status
validated

## Post Type
Tutorial / Administration Guide

## Technologies Covered
- MongoDB (sharded clusters)
- MongoDB Balancer (chunk migration)
- mongosh shell helpers (`sh.stopBalancer`, `sh.startBalancer`, `sh.getBalancerState`, `sh.isBalancerRunning`, `sh.disableBalancing`, `sh.enableBalancing`)
- MongoDB admin commands (`balancerStop`, `balancerStart`, `balancerStatus`)

## Sources Consulted
- MongoDB official documentation: `sh.stopBalancer()` — https://www.mongodb.com/docs/manual/reference/method/sh.stopBalancer/
- MongoDB official documentation: `sh.startBalancer()` — https://www.mongodb.com/docs/manual/reference/method/sh.startBalancer/
- MongoDB official documentation: `balancerStop` command — https://www.mongodb.com/docs/manual/reference/command/balancerStop/
- MongoDB official documentation: `balancerStart` command — https://www.mongodb.com/docs/manual/reference/command/balancerStart/
- MongoDB official documentation: `balancerStatus` command — https://www.mongodb.com/docs/manual/reference/command/balancerStatus/
- MongoDB official documentation: Manage Sharded Cluster Balancer — https://www.mongodb.com/docs/manual/tutorial/manage-sharded-cluster-balancer/
- MongoDB official documentation: `sh.disableBalancing()` — https://www.mongodb.com/docs/manual/reference/method/sh.disableBalancing/

## Issues Found

### Issue 1: `sh.stopBalancer(30000)` — incorrect timeout parameter
- **What was wrong:** The post showed `sh.stopBalancer(30000)` as a way to wait up to 30 seconds for in-progress migrations to finish. In modern MongoDB (mongosh, 5.0+), `sh.stopBalancer()` does not accept a timeout parameter — any argument passed is silently ignored. The timeout parameter was only supported in the legacy `mongo` shell (removed in MongoDB 6.0).
- **What was changed:** Replaced with `db.adminCommand({ balancerStop: 1, maxTimeMS: 30000 })`, which is the correct way to specify a timeout for the balancer stop operation. Updated the surrounding text to reflect this uses the admin command directly.
- **Why:** Readers using modern MongoDB would get no timeout behavior from the original code, potentially waiting indefinitely without realizing the parameter has no effect.

### Issue 2: `db.locks.findOne({ _id: "balancer" })` — legacy monitoring approach
- **What was wrong:** The monitoring section recommended checking `config.locks` for the balancer lock. Since MongoDB 3.6+, the balancer runs on the config server primary and no longer uses distributed locks in `config.locks` the same way. This check may not reliably indicate balancer activity in modern versions.
- **What was changed:** Replaced the `db.locks` query with `db.adminCommand({ balancerStatus: 1 })`, which is the documented and reliable way to check balancer activity via the `inBalancerRound` field. Kept the `config.changelog` query which remains valid.
- **Why:** Using the official `balancerStatus` command provides accurate, version-stable results rather than relying on internal collection structures that have changed across versions.

## Review Notes
- The `config.changelog` collection and `moveChunk.from` event type used in the monitoring section are correct and remain valid in modern MongoDB.
- The `sh.disableBalancing()` and `sh.enableBalancing()` methods for per-collection balancing control are correct.
- The `balancerStatus` output sample showing `mode: 'full'` (enabled) and `mode: 'off'` (disabled) is accurate.
- The overall guidance about stopping the balancer before backups and maintenance is consistent with MongoDB best practices.
