# Validation Summary: How to Use Arbiter Nodes in MongoDB Replica Set

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB Replica Sets
- MongoDB Arbiter Nodes
- MongoDB Elections and Quorum
- MongoDB Write Concern
- MongoDB Security (keyfile authentication)

## Sources Consulted
- MongoDB Manual: Replica Set Arbiter (https://www.mongodb.com/docs/manual/core/replica-set-arbiter/)
- MongoDB Manual: rs.addArb() (https://www.mongodb.com/docs/manual/reference/method/rs.addArb/)
- MongoDB Manual: rs.add() (https://www.mongodb.com/docs/manual/reference/method/rs.add/)
- MongoDB Manual: Write Concern (https://www.mongodb.com/docs/manual/reference/write-concern/)
- MongoDB Manual: setDefaultRWConcern (https://www.mongodb.com/docs/manual/reference/command/setDefaultRWConcern/)
- MongoDB Manual: collMod (https://www.mongodb.com/docs/manual/reference/command/collMod/)
- MongoDB Manual: Replica Set Elections (https://www.mongodb.com/docs/manual/core/replica-set-elections/)

## Issues Found

1. **Incorrect PSA step-down claim**: The post stated "the primary will step down because it cannot satisfy `w: majority`". This is wrong. In a PSA set when the secondary goes down, the primary retains its role because it still has a majority of votes (primary + arbiter = 2/3). Writes with `w: "majority"` will fail/timeout, but the primary does not step down. Fixed to accurately describe that the primary remains running while majority writes fail.

2. **Incorrect `collMod` writeConcern example**: The post showed `db.runCommand({ collMod: "orders", writeConcern: { w: 1 } })` with a comment saying "set write concern at the collection level." The `writeConcern` parameter on `collMod` only applies to the `collMod` command itself — it does not set a persistent default write concern on the collection. MongoDB has no per-collection default write concern feature. Replaced with the correct approach using `db.adminCommand({ setDefaultRWConcern: 1, defaultWriteConcern: { w: 1 } })`.

3. **Imprecise security claim about oplog metadata**: The post stated arbiters "receive oplog metadata and connection credentials." Arbiters do not receive oplog data or metadata — they participate in heartbeats and exchange authentication credentials during the replication handshake. Fixed to accurately describe the credential exchange.

4. **Code block language label**: The first YAML configuration snippet was labeled as `bash` instead of `yaml`. Fixed the language tag.

## Review Notes
- The post's own summary section (final paragraph) correctly stated "even though the primary is still running," which contradicted the earlier incorrect claim in the Limitations section. Both are now consistent after the fix.
- The PSA vs. Three-Node comparison table is accurate and helpful.
- The post could benefit from mentioning that starting in MongoDB 5.0, the default write concern is `w: "majority"`, making the PSA limitation more impactful for users on modern versions. Not changed since this is a potential enhancement, not an error.
