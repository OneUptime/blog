# Validation Summary: How to Define Window Boundaries (range, documents) in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+)
- MongoDB Aggregation Framework (`$setWindowFields`)
- Window Functions (`$sum`, `$avg`, `$count`)

## Sources Consulted
- MongoDB official documentation: `$setWindowFields` reference — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official documentation: `$count` accumulator — https://www.mongodb.com/docs/manual/reference/operator/aggregation/count-accumulator/
- MongoDB official documentation: Window function operators — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#window-operators

## Issues Found
- **Incorrect sort field type for time range window**: The first `range` example used `sortBy: { dayOfYear: 1 }` with `unit: "day"`. The MongoDB docs explicitly state "Time range windows require all sortBy values to be dates." The `unit` option requires the sort field to be a Date type, but `dayOfYear` is conventionally a numeric field (integer 1-365). Changed the sort field to `saleDate` to correctly represent a Date-type field, making the example valid with the `unit: "day"` option.

## Review Notes
- The `documents` boundary examples use comments like "3-day moving average" for `documents: [-2, 0]`, which is technically a 3-document window, not a 3-day window. It would only be equivalent to 3 days if there is exactly one document per day. The distinction is acknowledged in the text ("The documents window counts by position regardless of the actual sort values"), so this is not an error but could be clearer.
- All other code examples, syntax, special keywords (`"unbounded"`, `"current"`), supported time units, and the behavior of omitting the `window` key are accurate per the official MongoDB documentation.
- The `$count: {}` syntax used in the date-based range example is valid for `$setWindowFields` (available since MongoDB 5.0).
