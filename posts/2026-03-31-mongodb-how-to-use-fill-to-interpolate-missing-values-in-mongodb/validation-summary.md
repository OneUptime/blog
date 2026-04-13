# Validation Summary: How to Use $fill to Interpolate Missing Values in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.3+)
- MongoDB Aggregation Framework
- `$fill` aggregation stage
- `$densify` aggregation stage
- Time series data handling

## Sources Consulted
- MongoDB official documentation for `$fill`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/fill/
- MongoDB official documentation for `$densify`: https://www.mongodb.com/docs/manual/reference/operator/aggregation/densify/

## Issues Found

### 1. "Handling the First Document" section showed incorrect single-pass approach
- **What was wrong:** The section recommended using `$fill` with `{ value: 0 }` as a standalone operation to handle leading nulls that LOCF cannot fill. However, this approach fills ALL null values with the constant 0, not just the leading nulls. This would defeat the purpose of using LOCF or linear interpolation for the non-leading nulls.
- **What was changed:** Replaced the single-pass constant fill with a two-pass pipeline: first a `$fill` with `method: "locf"` to handle all fillable nulls, then a second `$fill` with `{ value: 0 }` to catch only the remaining leading nulls (which LOCF left untouched because there was no preceding non-null value).
- **Why:** After the LOCF pass, the only remaining null values are the leading ones (those before any non-null value in the partition). The subsequent constant fill then correctly targets only those leading nulls without overwriting values that LOCF should have handled.

## Review Notes
- The backward fill technique (reversing sort order with LOCF) is a valid workaround but is not an officially documented MongoDB feature. The blog presents it appropriately as a technique rather than a built-in capability.
- The blog omits the `partitionBy` expression-based alternative to `partitionByFields`. This is a minor omission — `partitionByFields` is the simpler and more commonly used option, so its exclusive coverage is reasonable for a tutorial.
- The pseudo-syntax `{ method: "locf" | "linear" | value: literal }` in the overview is not valid JavaScript but serves well as illustrative shorthand for the three fill options.
- All other code examples, fill method descriptions, and the `$densify` + `$fill` pattern are technically correct and consistent with MongoDB 5.3+ documentation.
