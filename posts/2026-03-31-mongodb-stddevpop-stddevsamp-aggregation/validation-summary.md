# Validation Summary: How to Use $stdDevPop and $stdDevSamp in MongoDB Aggregation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Aggregation Framework
- `$stdDevPop` operator
- `$stdDevSamp` operator
- `$setWindowFields` stage
- `$group` stage

## Sources Consulted
- MongoDB official docs: `$stdDevPop` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevPop/
- MongoDB official docs: `$stdDevSamp` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/stdDevSamp/
- MongoDB official docs: `$setWindowFields` — https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/

## Issues Found

1. **Misleading section heading "Using in $project"**: The section was titled "Using in $project" and described the operators as being used "in `$project` over window expressions," but the code example actually used `$setWindowFields`, not `$project`. While these operators can be used in `$project` (to compute standard deviation over an array field within a single document), the example demonstrated cross-document window calculations via `$setWindowFields`. Renamed the section to "Using in $setWindowFields" and corrected the description.

2. **Inaccurate "rolling 7-day" description**: The `$setWindowFields` example used `window: { documents: [-6, 0] }`, which defines a document-based window (current document plus 6 preceding), not a time-based window. The blog described this as a "rolling 7-day standard deviation," which is only true if there is exactly one document per day with no gaps. Changed the description to accurately reflect that it is a 7-document window, and added a note about using `range` with `unit` for true time-based windows.

## Review Notes
- The claim about Bessel's correction for `$stdDevSamp` is mathematically correct (sample standard deviation divides by N-1), though MongoDB's official documentation does not mention "Bessel's correction" by name. This is acceptable as a helpful explanatory detail.
- All code examples use correct syntax verified against official docs.
- The null/missing value behavior and single-document behavior descriptions are accurate per the official documentation.
- `$setWindowFields` (and thus rolling window standard deviations) requires MongoDB 5.0+; the post does not mention this version requirement. This is a minor omission but not an error.
