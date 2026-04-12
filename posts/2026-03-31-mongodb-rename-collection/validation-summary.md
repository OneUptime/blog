# Validation Summary: How to Use db.collection.renameCollection() in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell methods and admin commands)
- mongosh (MongoDB Shell)

## Sources Consulted
- MongoDB official docs: `db.collection.renameCollection()` method reference — https://www.mongodb.com/docs/manual/reference/method/db.collection.renameCollection/
- MongoDB official docs: `renameCollection` command reference — https://www.mongodb.com/docs/manual/reference/command/renameCollection/
- MongoDB official docs: Privilege actions reference — https://www.mongodb.com/docs/manual/reference/privilege-actions/

## Issues Found

1. **Sharded collections claim was outdated.** The post stated that `renameCollection` is "not supported for sharded collections" and recommended a bulk copy and drop approach. Since MongoDB 5.0, `renameCollection` IS supported for sharded collections within the same database. Updated the limitation to reflect the current behavior.

2. **Blue-green swap incorrectly described as "atomic."** The post described the two-step rename pattern (old → backup, new → production) as an "atomic" swap. These are two sequential operations with a brief window in between where the production name does not exist. Changed "atomically" to "with minimal downtime using two sequential renames" and changed "atomic blue-green swaps" to "fast blue-green swaps" in the summary.

3. **Cross-database rename privilege claim was inaccurate.** The post stated that cross-database renames require the `renameCollection` privilege on both source and target namespaces. The actual privilege model is more granular: it requires `find` on the source collection and `insert` on the target collection (plus `dropCollection` on the target if `dropTarget` is true). Updated to accurately describe the required privileges.

## Review Notes
- The "metadata-only operation" claim in the Overview is appropriately scoped to same-database renames ("within the same database"). Cross-database renames copy all documents and are not metadata-only; the post's cross-database section uses `adminCommand` without claiming it is metadata-only, which is correct.
- The `{ dropTarget: true }` object syntax shown as the second parameter to `renameCollection()` works in mongosh but the official docs only document a boolean parameter. Left as-is since it functions correctly in the modern shell, but future readers should note the canonical form is just `true`.
- The change streams bullet could be more precise: rename operations don't just stop events but send an explicit `invalidate` event to open change stream cursors. This is a minor nuance and was not changed.
