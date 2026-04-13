# Validation Summary: How to Monitor Collection Growth Over Time in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell, collStats command, aggregation framework)
- MongoDB Atlas App Services (Scheduled Triggers)
- `$setWindowFields` aggregation stage (MongoDB 5.0+)
- `$collStats` / `collStats` command

## Sources Consulted
- MongoDB `collStats` command documentation: https://www.mongodb.com/docs/manual/reference/command/collStats/
- MongoDB `db.collection.stats()` shell method: https://www.mongodb.com/docs/manual/reference/method/db.collection.stats/
- MongoDB `$setWindowFields` aggregation stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB `$shift` window operator: https://www.mongodb.com/docs/manual/reference/operator/aggregation/shift/
- MongoDB Atlas App Services / Triggers documentation: https://www.mongodb.com/docs/atlas/app-services/triggers/scheduled-triggers/
- MongoDB Node.js driver `Db.command()`: https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

1. **Snapshot function produced incompatible document format**: The `snapshotCollectionGrowth` function stored snapshots as a single nested document (`{ timestamp, collections: { orders: {...}, users: {...} } }`), but all subsequent aggregation queries expected flat per-collection documents with top-level `collectionName`, `documentCount`, and `storageSizeMB` fields. The index on `{ collectionName: 1, timestamp: 1 }` also wouldn't match the nested format. Fixed by restructuring the function to produce one flat document per collection using `insertMany` instead of `insertOne`.

2. **Invalid `$setWindowFields` usage**: The `$subtract` operator was used directly inside `$setWindowFields.output` to wrap a `$shift` call. `$subtract` is an arithmetic expression operator, not a window function operator — only window operators like `$shift`, `$sum`, `$avg`, etc. are valid in the `output` field of `$setWindowFields`. This would produce a MongoDB error at runtime. Fixed by splitting into a `$setWindowFields` stage (using `$shift` to get `prevDayCount`) followed by an `$addFields` stage (using `$subtract` to compute `dailyDocGrowth`).

3. **Atlas Trigger used mongosh-only `.stats()` method**: The Atlas Trigger code called `db.collection(name).stats()`, but `.stats()` is a mongosh shell helper method — it is not available in Atlas App Services functions, which use the MongoDB Node.js driver API. Fixed by replacing with `await db.command({ collStats: name })`. Also changed from synchronous `.map()` to an async `for...of` loop since `db.command()` returns a Promise.

4. **Unused `adminDb` variable in Atlas Trigger**: The line `const adminDb = cluster.db("admin")` was declared but never referenced. Removed the dead code.

## Review Notes
- The `collStats` database command was deprecated in MongoDB 6.2 in favor of the `$collStats` aggregation stage. The mongosh `db.collection.stats()` helper still works, but users on MongoDB 6.2+ may want to migrate to `$collStats`. This is not an error for now but worth watching for future deprecation.
- The "Estimating Future Size" section uses only the 2 most recent snapshots to calculate growth rate, which can produce noisy estimates. A more robust approach would use a larger sample window, but this is a design choice, not a technical error.
- The description mentions "change streams" as a monitoring approach but the post doesn't actually cover change streams.
