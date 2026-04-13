# Validation Summary: How to Use $max to Update a Field Only If the New Value Is Higher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- MongoDB `$max` update operator
- MongoDB `$min` update operator (comparison)
- MongoDB `$set`, `$inc` operators (used alongside `$max`)
- MongoDB `updateOne` and `updateMany` methods
- MongoDB upsert option

## Sources Consulted
- MongoDB official documentation: `$max` update operator (https://www.mongodb.com/docs/manual/reference/operator/update/max/)
- MongoDB official documentation: `$min` update operator (https://www.mongodb.com/docs/manual/reference/operator/update/min/)
- MongoDB official documentation: Update operators (https://www.mongodb.com/docs/manual/reference/operator/update/)
- MongoDB official documentation: BSON comparison order (https://www.mongodb.com/docs/manual/reference/bson-type-comparison-order/)

## Issues Found
No technical issues found.

## Review Notes
- The "Using $max with updateMany" section uses `$max` to establish a floor value (minimum credit score of 300), which is a clever but potentially counterintuitive use of `$max`. The explanation and comments correctly describe the behavior, so no change is needed.
- The "Handling Out-of-Order Events" section introduces the concept as keeping "the latest known state," but `$max` on `peakValue` actually keeps the highest value, not the value from the latest event. The concluding sentence ("the latest timestamp and peak value are preserved") is technically accurate since it distinguishes the two, so this is a minor clarity observation rather than an error.
- All code examples use valid `mongosh` JavaScript syntax compatible with current MongoDB versions.
