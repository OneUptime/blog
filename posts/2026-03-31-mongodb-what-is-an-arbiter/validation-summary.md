# Validation Summary: What Is an Arbiter in a MongoDB Replica Set

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- MongoDB replica sets
- MongoDB Shell (mongosh) commands (`rs.addArb()`, `rs.add()`, `rs.conf()`, `rs.status()`, `rs.remove()`)
- MongoDB arbiter member type
- Write concern (`w: "majority"`)
- PSA (Primary-Secondary-Arbiter) vs PSS (Primary-Secondary-Secondary) topologies

## Sources Consulted
- MongoDB Manual: Replica Set Arbiter — https://www.mongodb.com/docs/manual/core/replica-set-arbiter/
- MongoDB Manual: rs.addArb() — https://www.mongodb.com/docs/manual/reference/method/rs.addArb/
- MongoDB Manual: rs.add() — https://www.mongodb.com/docs/manual/reference/method/rs.add/
- MongoDB Manual: rs.remove() — https://www.mongodb.com/docs/manual/reference/method/rs.remove/
- MongoDB Manual: Write Concern — https://www.mongodb.com/docs/manual/reference/write-concern/
- MongoDB Manual: Replica Set Elections — https://www.mongodb.com/docs/manual/core/replica-set-elections/

## Issues Found
No technical issues found.

## Review Notes
- The code comment "no data directory requirement (or a small one)" is slightly imprecise — arbiters do require a `--dbpath` for internal metadata and journal, but the parenthetical and the actual command (`--dbpath /data/arb`) make the intent clear. Not a technical error.
- The mitigation suggestion of setting the secondary's votes to 0 is technically valid but trades write durability for availability. The post appropriately lists it alongside the better recommendation of switching to a PSS topology.
- Starting from MongoDB 5.0, arbiters cannot be deployed on the same system as another replica set member. The post does not mention this restriction, which could be a useful addition in a future update.
- The `rs.addArb()` method is still supported but some MongoDB deployments may prefer the explicit `rs.add({ arbiterOnly: true })` form for clarity. Both are shown, which is good.
