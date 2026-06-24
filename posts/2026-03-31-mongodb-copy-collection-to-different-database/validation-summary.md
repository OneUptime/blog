# Validation Summary: How to Copy a Collection to a Different Database in MongoDB

## Status
validated

## Post Type
Guide / Administration Tutorial

## Technologies Covered
- MongoDB Database Tools: mongodump, mongorestore, mongoexport, mongoimport
- Aggregation `$out` stage (with `db`/`coll` document form)
- mongosh scripting: getSiblingDB, find/skip/limit, insertMany, getIndexes, createIndex, countDocuments

## Sources Consulted
- `$out` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/out/ (verified the `{ $out: { db: "<db>", coll: "<coll>" } }` document form for writing to a different database, and that `$out` creates the output database if missing)
- mongorestore reference — https://www.mongodb.com/docs/database-tools/mongorestore/ (verified `--nsFrom`/`--nsTo` rename behavior, `--archive` from file or stdin, and that `--db`/`--collection` are valid when restoring a single `.bson` file)

## Issues Found
- None — code examples, commands, and technical claims were verified against the sources above and are accurate.

## Review Notes
- Method 1 restores a single BSON file with `--db targetDB --collection myCollection /tmp/dump/sourceDB/myCollection.bson`. Per the mongorestore docs, `--db`/`--collection` are deprecated only for directory/archive restores but remain valid for a single `.bson` file, so this example is correct. The note that mongorestore picks up the sibling `.metadata.json` for indexes/options is accurate.
- The piped `mongodump --archive | mongorestore --nsFrom="sourceDB.myCollection" --nsTo="targetDB.myCollection" --archive` form matches the documented archive + namespace-rename usage.
- `$out` to a different database via `{ db, coll }` is confirmed; the post attributes this to MongoDB 4.4+, which matches the well-documented release that added cross-database `$out`. The stage was verified against the current manual page.
- Correctly notes `$out` and `insertMany` do not copy indexes, and that mongoexport/mongoimport (JSON/CSV) do not preserve indexes — both accurate. The manual index-replication snippet using `getIndexes()`/`createIndex()` and excluding `_id_` is valid.
