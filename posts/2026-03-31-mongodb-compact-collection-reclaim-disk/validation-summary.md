# Validation Summary: How to Compact a Collection to Reclaim Disk Space in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (compact command, WiredTiger storage engine)
- mongosh (MongoDB Shell)
- Bash scripting

## Sources Consulted
- MongoDB official documentation: compact command — https://www.mongodb.com/docs/manual/reference/command/compact/
- MongoDB 4.4 release notes (compact improvements) — https://www.mongodb.com/docs/manual/release-notes/4.4/
- MongoDB 6.0 release notes (force option removal) — https://www.mongodb.com/docs/manual/release-notes/6.0/
- MongoDB official documentation: collStats — https://www.mongodb.com/docs/manual/reference/command/collStats/

## Issues Found
1. **`force: true` is deprecated/removed**: The post presented `force: true` as the current way to run `compact` on a primary. This option was deprecated in MongoDB 4.4 (when `compact` became allowed on primaries by default) and removed in MongoDB 6.0. Fixed by removing the `force: true` usage and documenting the version history.

2. **Incorrect write lock claim**: The post stated "Running compact on a primary holds a write lock on the collection." Since MongoDB 4.4, `compact` yields to read and write operations and no longer holds a blocking lock. Fixed the description to reflect current behavior while still recommending low-traffic windows.

3. **Misleading space return description**: The overview stated compact "returns unused space to the WiredTiger storage engine," implying space stays within WiredTiger. Since MongoDB 4.4, `compact` returns freed space to the operating system. Fixed to clarify this distinction.

4. **Automation script used `force: true`**: The bash automation script included the deprecated `force: true` flag. Removed it to match the corrected guidance.

## Review Notes
- `db.collection.stats()` is a shell helper that wraps the `collStats` command. While it still works in mongosh, MongoDB documentation increasingly favors `db.runCommand({ collStats: "collection" })` or the `$collStats` aggregation stage. This is not incorrect but worth noting for future updates.
- The "storageSize minus size equals fragmented space" explanation is a simplification — the difference also includes internal overhead and padding — but it is a reasonable approximation for this context.
