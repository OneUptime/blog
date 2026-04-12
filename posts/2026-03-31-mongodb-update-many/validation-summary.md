# Validation Summary: How to Update Multiple Documents with updateMany() in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell / `mongosh`)
- `updateMany()` method
- Update operators: `$set`, `$mul`, `$inc`, `$unset`, `$setOnInsert`
- Array update with `arrayFilters`
- Upsert behavior

## Sources Consulted
- MongoDB official documentation: `db.collection.updateMany()` — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
- MongoDB official documentation: Update Operators — https://www.mongodb.com/docs/manual/reference/operator/update/
- MongoDB official documentation: `$mul` operator — https://www.mongodb.com/docs/manual/reference/operator/update/mul/
- MongoDB official documentation: `arrayFilters` — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/#std-label-updateMany-arrayFilters

## Issues Found

### 1. Section title/description mismatch with `$mul` operator
**What was wrong:** The section "Incrementing a Field on Multiple Documents" stated "Use `$inc` to apply a numeric increment" but the code example actually used `$mul` (multiply). The code was correct for a 10% price increase, but the title and description were misleading.
**What was changed:** Renamed the section to "Multiplying a Field on Multiple Documents" and changed the description to "Use `$mul` to apply a numeric multiplier."

### 2. Misleading intro text for "Applying Updates to All Documents" section
**What was wrong:** The section intro said "Pass an empty filter `{}` to update every document in the collection" but the code example used `{ status: { $exists: false } }`, which is not an empty filter.
**What was changed:** Updated the intro text to mention that you can also use query operators like `$exists` to target specific subsets, making the text consistent with the code shown.

### 3. Broken batching example in Performance Considerations
**What was wrong:** The batching code had multiple issues: (a) `updateMany()` does not support a `limit` option — it would be silently ignored, updating all matching documents at once; (b) `result` was declared with `const` inside the `do` block, making it inaccessible in the `while` condition due to block scoping; (c) the inline comment acknowledged the approach was wrong but still presented it as a code example.
**What was changed:** Replaced the example with a correct batching pattern that uses `find().limit()` to fetch a batch of `_id` values, then uses `updateMany()` with `{ _id: { $in: ids } }` to update just that batch. This is a well-known and functional batching approach.

## Review Notes
- The post's summary section mentions `$inc` as an example operator used in the post, but the post actually demonstrates `$mul`. This is not technically wrong (the summary lists `$inc` as a general-purpose operator, not specific to the example) so it was left unchanged.
- The upsert section correctly notes that `updateMany()` with upsert inserts at most one document if nothing matches. This is accurate per MongoDB documentation.
- The `$unset` example uses `{ legacyId: "" }` — the value passed to `$unset` is irrelevant (any value works), so this is correct.
