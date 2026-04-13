# Validation Summary: How to Compact a MongoDB Collection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- MongoDB (compact command)
- WiredTiger storage engine
- MongoDB replica sets
- mongosh shell

## Sources Consulted
- Official MongoDB `compact` command documentation: https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB `compact` source on GitHub: https://github.com/mongodb/docs/blob/master/source/reference/command/compact.txt
- MongoDB `collStats` deprecation notes: https://www.mongodb.com/docs/manual/reference/command/collstats/
- MongoDB change oplog size tutorial (compact on local db): https://www.mongodb.com/docs/manual/tutorial/change-oplog-size/

## Issues Found

1. **`force: true` comment was incorrect.** The comment said "Force compact even if enough disk space is available." In reality, `force: true` allows compact to run on a replica set primary — it has nothing to do with disk space. Fixed the comment to accurately describe its purpose.

2. **Blocking behavior claim was inverted.** The post stated "In MongoDB 4.4+, on a primary it will block all other operations on that database." This is the opposite of reality — MongoDB 4.4+ was the version that *relaxed* locking. Before 4.4, compact blocked all database operations. Starting in 4.4 (WiredTiger), compact only blocks metadata operations (drop, createIndex, dropIndex), not CRUD. Rewrote the paragraph to accurately describe the version-specific behavior.

3. **Misleading padding factor example removed.** The post had a third compact example with the comment "Compact with padding factor (deprecated in WiredTiger)" but the code was identical to the basic compact command (no padding factor was shown). The `paddingFactor` option was MMAPv1-only and was removed entirely in MongoDB 4.2. Removed this confusing example.

4. **Incorrect claim about `local` database.** The post stated "`compact` does not run on the `local` database." This is false — compact can run on collections in the `local` database (including `oplog.rs` for oplog size management). Replaced with the accurate restriction: compact does not work on capped collections.

5. **Overstated disk space requirement.** The post claimed "The command requires free disk space of approximately the collection size during execution." The official documentation only states compact "may require additional disk space" without specifying an amount. Fixed to match the official documentation language.

6. **Removed inaccurate claims about `config`/`admin` databases.** The post stated "Collections in `config` or `admin` databases require special handling" without elaboration. This is not supported by the current documentation and was removed.

## Review Notes
- `db.collection.stats()` relies on the `collStats` command which was deprecated in MongoDB 6.2. The recommended replacement is the `$collStats` aggregation stage. This is not changed in the post since the method still functions and the post does not target a specific MongoDB version, but it may need updating in the future.
- The monitoring section's `currentOp` example output is illustrative and reasonable but the exact field names and format may vary across MongoDB versions.
- The replica set workflow is sound advice and follows MongoDB best practices.
