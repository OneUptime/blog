# Validation Summary: How to Use $documentNumber for Sequential Numbering in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (5.0+)
- `$documentNumber` window function
- `$setWindowFields` aggregation stage
- `$rank` and `$denseRank` (for comparison)
- `$dateToString` aggregation operator

## Sources Consulted
- MongoDB official documentation: `$documentNumber` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/documentNumber/
- MongoDB official documentation: `$setWindowFields` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/setWindowFields/
- MongoDB official documentation: `$rank` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/rank/
- MongoDB official documentation: `$denseRank` - https://www.mongodb.com/docs/manual/reference/operator/aggregation/denseRank/

## Issues Found
1. **Incorrect terminology: "Keyset Pagination" section title and description.** The section was titled "Keyset Pagination with $documentNumber" and described the technique as "cursor-based pagination." However, the code demonstrates offset-style pagination using row numbers (filtering by `rowNum` ranges), not true keyset/cursor-based pagination. Keyset pagination uses actual field values from the last seen document to fetch the next page (e.g., `WHERE id > last_seen_id`), which is fundamentally different from computing row numbers and filtering by numeric ranges. Changed the section title to "Offset Pagination with $documentNumber" and updated the description to "offset-style pagination." Also updated the Summary section to say "pagination" instead of "cursor-based pagination."

## Review Notes
- All code examples use correct MongoDB syntax and would work as described on MongoDB 5.0+.
- The `$documentNumber: {}` syntax (empty object, no parameters) is correct per the official docs.
- The comparison table showing `$rank` producing [1, 2, 2, 4], `$denseRank` producing [1, 2, 2, 3], and `$documentNumber` producing [1, 2, 3, 4] for scores [90, 85, 85, 80] is accurate.
- The Top-N per partition pattern is a valid and common use case for `$documentNumber`.
- The pagination approach shown works but processes all documents before filtering, which may be inefficient on large collections. This is inherent to the approach rather than an error.
