# Validation Summary: How to Use $sort with $push in MongoDB to Sort Arrays on Update

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (update operators: `$push`, `$sort`, `$each`, `$slice`, `$position`)

## Sources Consulted
- MongoDB official documentation: `$push` operator (https://www.mongodb.com/docs/manual/reference/operator/update/push/)
- MongoDB official documentation: `$sort` modifier (https://www.mongodb.com/docs/manual/reference/operator/update/sort/)
- MongoDB official documentation: `$slice` modifier (https://www.mongodb.com/docs/manual/reference/operator/update/slice/)
- MongoDB official documentation: `$position` modifier (https://www.mongodb.com/docs/manual/reference/operator/update/position/)

## Issues Found
No technical issues found.

## Review Notes
- The example combining `$position` with `$sort` and `$slice` is technically valid, but readers should be aware that `$position` has no practical effect when `$sort` is also present, since `$sort` reorders the entire array after insertion. The post does not claim otherwise, so this is not an error.
- All code examples use correct `mongosh` syntax and produce the expected results as shown in the comments.
- The sorting stability caveat is a valuable and accurate addition — MongoDB does not guarantee stable sort for array elements with equal sort keys.
