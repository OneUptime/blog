# Validation Summary: How to Work with Epoch Timestamps in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (BSON Date type, aggregation framework)
- JavaScript (Date API, mongo shell)

## Sources Consulted
- MongoDB Manual: BSON Date type — https://www.mongodb.com/docs/manual/reference/bson-types/#date
- MongoDB Manual: `$toDate` aggregation operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/toDate/
- MongoDB Manual: `$toLong` aggregation operator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/toLong/
- MongoDB Manual: `$year` and `$month` aggregation operators — https://www.mongodb.com/docs/manual/reference/operator/aggregation/year/
- MongoDB Manual: `updateMany` with aggregation pipeline — https://www.mongodb.com/docs/manual/reference/method/db.collection.updateMany/
- MongoDB Manual: `$addFields` aggregation stage — https://www.mongodb.com/docs/manual/reference/operator/aggregation/addFields/
- MongoDB Manual: Indexes — https://www.mongodb.com/docs/manual/indexes/
- Node.js / JavaScript `Date.prototype.getTime()` — verified via local Node.js execution

## Issues Found
- **Incorrect epoch values in comments**: In the "Querying by Epoch Number" section, the inline comments showed `1740787200000` and `1743465600000` as the epoch values for `2026-03-01` and `2026-04-01` respectively. These are actually the epoch values for the **2025** dates. The correct values are `1772323200000` (2026-03-01T00:00:00Z) and `1775001600000` (2026-04-01T00:00:00Z). Fixed the comments to show the correct values. The code itself (`new Date("2026-03-01T00:00:00Z").getTime()`) would produce the correct result at runtime — only the hardcoded comment values were wrong.

## Review Notes
- All MongoDB aggregation operators used (`$toDate`, `$toLong`, `$year`, `$month`, `$addFields`, `$convert`, `$floor`, `$divide`) are valid and available since MongoDB 4.0+.
- The `updateMany` with an aggregation pipeline array syntax is valid since MongoDB 4.2.
- The `$unset` stage within a pipeline update using a string value is correct syntax.
- The description of BSON Date as storing "UTC milliseconds internally" is accurate (64-bit integer of milliseconds since epoch).
- The recommendation to prefer BSON Date over raw epoch integers is sound advice for most use cases.
