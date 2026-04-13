# Validation Summary: How to Use Capped Collections in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (capped collections, tailable cursors, convertToCapped command)
- MongoDB Shell (legacy `mongo` shell and `mongosh`)
- Node.js MongoDB Driver

## Sources Consulted
- MongoDB official documentation on capped collections: https://www.mongodb.com/docs/manual/core/capped-collections/
- MongoDB official documentation on `db.createCollection()`: https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB official documentation on tailable cursors: https://www.mongodb.com/docs/manual/core/tailable-cursors/
- MongoDB official documentation on `convertToCapped`: https://www.mongodb.com/docs/manual/reference/command/convertToCapped/
- mongosh documentation (cursor methods): https://www.mongodb.com/docs/mongodb-shell/
- Node.js MongoDB Driver documentation (FindOptions): https://www.mongodb.com/docs/drivers/node/current/

## Issues Found

1. **Incorrect shell label for tailable cursor example (line 82):** The tailable cursor code used `DBQuery.Option.tailable` and `addOption()`, which are legacy `mongo` shell methods not available in `mongosh`. The section was labeled "In mongosh:" which is incorrect. Changed the label to "In the legacy mongo shell (`mongo`):" to accurately reflect the API being used.

2. **Contradictory claim about in-place conversion (line 122):** The section stated "MongoDB does not support in-place conversion" but then immediately showed the `convertToCapped` command, which performs exactly that. Changed the opening to "For a safe conversion with full control, create a new capped collection and copy the data:" to remove the contradiction while preserving the recommendation to use the manual approach.

3. **Misleading `_id` index and natural order claim (line 176):** The limitations section stated "The `_id` index is created automatically but is the only index guaranteed to be in natural order." This is technically inaccurate - the `_id` index is a standard B-tree index and has no special relationship to natural (insertion) order. Natural order in capped collections is a property of the collection's storage, not of any index. Changed to "The `_id` index is created automatically. You can create additional secondary indexes on capped collections."

## Review Notes
- The deletion restriction ("You cannot delete individual documents from a capped collection") was relaxed starting in MongoDB 6.0, which now allows deletes on capped collections. The update size restriction ("updated document cannot be larger than the original") was effectively removed in MongoDB 4.2+ with the WiredTiger storage engine. The post states these as absolute restrictions without version qualifiers. A future update could add version caveats to these limitations.
- The audit trail use case mentions "retain a rolling window of the last 90 days" but capped collections enforce size-based retention, not time-based. The post correctly addresses this distinction in the Best Practices section, so no change was made.
- The Node.js tailable cursor example sets `noCursorTimeout: false`, which means the cursor could time out after inactivity. For long-running tailable cursors, `noCursorTimeout: true` would typically be preferred, but this is a usage consideration rather than a correctness error.
- `db.collection.stats()` still works but the underlying `collStats` command is deprecated in MongoDB 6.0+ in favor of the `$collStats` aggregation stage. The shell helper remains functional, so no change was made.
