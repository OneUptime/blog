# Validation Summary: How to Use $expr to Compare Two Fields in the Same Document in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (`$expr` operator, aggregation expressions, query language)
- Node.js MongoDB driver
- PyMongo (Python MongoDB driver)
- MongoDB Aggregation Pipeline (`$match`, `$project`, `$sort`)

## Sources Consulted
- MongoDB official documentation on `$expr`: https://www.mongodb.com/docs/manual/reference/operator/query/expr/
- MongoDB official documentation on aggregation comparison operators (`$gt`, `$lt`, `$eq`, `$gte`): https://www.mongodb.com/docs/manual/reference/operator/aggregation/#comparison-expression-operators
- MongoDB official documentation on aggregation arithmetic operators (`$multiply`, `$subtract`, `$add`): https://www.mongodb.com/docs/manual/reference/operator/aggregation/#arithmetic-expression-operators
- MongoDB official documentation on `$match` stage: https://www.mongodb.com/docs/manual/reference/operator/aggregation/match/
- MongoDB Node.js driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- PyMongo documentation: https://pymongo.readthedocs.io/en/stable/
- Python `datetime.utcnow()` deprecation notice (Python 3.12): https://docs.python.org/3/library/datetime.html#datetime.datetime.utcnow

## Issues Found
No technical issues found.

## Review Notes
- The PyMongo example uses `datetime.utcnow()`, which is deprecated as of Python 3.12 and emits a `DeprecationWarning`. The recommended replacement is `datetime.now(datetime.UTC)`. The code still functions correctly, but future readers on Python 3.12+ will see a warning. This is a minor Python best-practice note rather than a MongoDB error.
- The `timedelta` import in the Python example is unused. Not a technical error, but slightly untidy.
- The summary states `$expr` is "the only way to compare two document fields in a query." Technically, `$where` with JavaScript expressions can also compare fields (e.g., `$where: "this.a > this.b"`), but `$where` is discouraged due to performance concerns and security implications. The claim is practically correct for recommended usage patterns.
- The index section correctly uses hedging language ("may use index") and directs readers to inspect the explain plan. In practice, field-to-field comparisons with `$expr` typically result in collection scans (COLLSCAN) regardless of indexes; indexes with `$expr` are most effective when comparing a field to a constant value.
