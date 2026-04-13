# Validation Summary: How to Use Scheduled Triggers for Cron Automation in MongoDB Atlas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- Atlas App Services (Triggers, Functions)
- CRON expressions
- Atlas App Services Admin API

## Sources Consulted
- MongoDB Atlas App Services Triggers documentation (https://www.mongodb.com/docs/atlas/app-services/triggers/scheduled-triggers/)
- MongoDB Atlas Functions documentation (https://www.mongodb.com/docs/atlas/app-services/functions/)
- MongoDB bulkWrite documentation (https://www.mongodb.com/docs/manual/reference/method/db.collection.bulkWrite/)
- MongoDB $set operator documentation (https://www.mongodb.com/docs/manual/reference/operator/update/set/) — confirms `_id` field is immutable and cannot appear in `$set` for updates
- Atlas App Services Admin API documentation (https://www.mongodb.com/docs/atlas/app-services/admin/api/v3/)

## Issues Found

1. **Bug: `_id` field included in `$set` via spread operator** — In the `aggregateDailyMetrics` function, `metrics.map(m => ({ updateOne: { update: { $set: { ...m, ... } } } }))` spreads the full `$group` result including `_id` into the `$set` update. MongoDB does not allow modifying the immutable `_id` field in an update operation, even via upsert on an existing document. This would cause a runtime error on any run after the first insert. Fixed by destructuring `_id` out of the group result before spreading: `const { _id, ...rest } = m;` and using `...rest` in the `$set`.

2. **Deprecated API domain** — The Admin API URL used the deprecated `realm.mongodb.com` domain. Updated to the current `services.cloud.mongodb.com` domain which replaced it for the Atlas App Services Admin API.

## Review Notes
- The `type=TRIGGER_SCHEDULED` query parameter in the Admin API monitoring example may need verification against the current API reference; the exact valid log type values can vary by API version.
- The cleanup function uses `setHours`/`getHours` (local time methods) rather than `setUTCHours`/`getUTCHours`. Since Atlas Functions run in a UTC environment this works correctly, but using UTC methods explicitly would be more defensive.
- All CRON expressions are correct for standard 5-field syntax in UTC.
- The trigger configuration JSON structure, Atlas Function syntax (`exports = async function()`), and `context.services.get()` API usage are all correct for Atlas App Services.
