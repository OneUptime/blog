# Validation Summary: How to Use $nin to Exclude Values in MongoDB Queries

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (query operators, aggregation framework)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)

## Sources Consulted
- MongoDB $nin operator documentation: https://www.mongodb.com/docs/manual/reference/operator/query/nin/
- MongoDB $in aggregation expression documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/in/
- MongoDB $not aggregation expression documentation: https://www.mongodb.com/docs/manual/reference/operator/aggregation/not/
- MongoDB query plan explain documentation: https://www.mongodb.com/docs/manual/reference/method/cursor.explain/
- Node.js MongoDB driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/

## Issues Found
No technical issues found.

## Review Notes
- The index behavior section correctly notes that `$nin` often causes collection scans, but the phrasing "When only a small fraction of the collection matches `$nin`" could be slightly clearer — it means when the result set is small (i.e., most values are excluded), an index may still be used. The core advice is accurate.
- The aggregation `$project` example uses the aggregation `$in` operator (not the query `$in`) combined with `$not`, which is the correct approach since `$nin` is not available as an aggregation expression operator.
- All code examples use current, non-deprecated APIs for both the Node.js driver and PyMongo.
