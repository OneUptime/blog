# Validation Summary: How to Calculate Running Totals with $setWindowFields in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB 5.0+
- MongoDB Aggregation Pipeline
- `$setWindowFields` stage
- `$sum` window accumulator
- `$avg` window accumulator
- Document-based and range-based window boundaries

## Sources Consulted
- MongoDB official documentation for `$setWindowFields`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official documentation for `$sum` (window operator): https://www.mongodb.com/docs/manual/reference/operator/aggregation/sum/#use-in-setwindowfields-stage
- MongoDB official documentation for window boundaries (documents and range): https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/#window

## Issues Found
- **Incorrect `dateLong` example with `unit: "day"`**: The "Running Total with Date Range Window" section contained two examples. The first used a field called `dateLong` with a comment stating it was a "Numeric representation of date," combined with `range: [-6, "current"], unit: "day"`. MongoDB requires the `sortBy` field to be a `Date` type when a `unit` is specified in a range window — using a numeric field would produce a runtime error. The blog post itself correctly stated this rule ("For date units, the field in `sortBy` must be a `Date` type") but contradicted it with the preceding code example. **Fix:** Removed the incorrect `dateLong` example and kept the correct `saleDate` example, integrating the Date-type requirement into the introductory sentence for the section.

## Review Notes
- All other code examples are syntactically correct and use valid MongoDB aggregation syntax.
- The `documents: ["unbounded", "current"]` pattern is correctly demonstrated throughout for running totals.
- The `$sum: 1` pattern for running counts is valid, though MongoDB also offers a dedicated `$count` window operator as an alternative (not an error, just a note).
- The `percentOfRegionTotal` calculation in the `$project` example computes "current revenue as a percentage of cumulative revenue so far" — this is technically correct code but the field name may be slightly misleading since it's not the percentage of the total region revenue, only of the cumulative total up to that point. This is a naming concern, not a code error, so it was left unchanged.
