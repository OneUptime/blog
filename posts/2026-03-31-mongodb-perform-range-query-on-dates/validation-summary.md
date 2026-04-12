# Validation Summary: How to Perform a Range Query on Dates in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators: `$gte`, `$lte`, `$lt`)
- MongoDB aggregation pipeline (`$match`, `$group`, `$sort`, `$month`, `$dateToString`)
- mongosh (`ISODate()`, `new Date()`)
- MongoDB indexing (`createIndex`, `explain`)

## Sources Consulted
- MongoDB Manual — Query on Date: https://www.mongodb.com/docs/manual/tutorial/query-documents/#query-on-date
- MongoDB Manual — Comparison Query Operators ($gte, $lte, $lt): https://www.mongodb.com/docs/manual/reference/operator/query-comparison/
- MongoDB Manual — $dateToString: https://www.mongodb.com/docs/manual/reference/operator/aggregation/dateToString/
- MongoDB Manual — $month: https://www.mongodb.com/docs/manual/reference/operator/aggregation/month/
- MongoDB Manual — createIndex: https://www.mongodb.com/docs/manual/reference/method/db.collection.createIndex/
- MongoDB Manual — explain(): https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- IANA Time Zone Database (America/New_York: EST = UTC-5, EDT = UTC-4)

## Issues Found
1. **Incorrect UTC offset for New York in June (EDT vs EST)**: The timezone example used June 15, which falls during Eastern Daylight Time (UTC-4), but the comment and UTC times incorrectly assumed EST (UTC-5). Specifically:
   - Comment said "(UTC-5)" — changed to "(UTC-4 in summer/EDT)"
   - Comment said "New York midnight = 05:00 UTC" — changed to "04:00 UTC"
   - `nyMidnight` was `"2024-06-15T05:00:00Z"` — changed to `"2024-06-15T04:00:00Z"`
   - `nyEndOfDay` was `"2024-06-16T04:59:59.999Z"` — changed to `"2024-06-16T04:00:00Z"` (also switched to the clean exclusive upper bound pattern consistent with `$lt`, matching the approach shown earlier in the post)

## Review Notes
- The post correctly recommends using exclusive upper bounds (`$gte`/`$lt`) over inclusive bounds (`$gte`/`$lte` with `.999`) for date ranges — the first example shows both patterns which is helpful for readers.
- The compound index example correctly places the equality field (`customerId`) before the range field (`placedAt`), which is the optimal ordering for MongoDB's ESR (Equality, Sort, Range) rule.
- The `setDate(getDate() - 30)` approach for relative dates handles month boundaries correctly in JavaScript (it rolls back across months as expected).
