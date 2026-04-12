# Validation Summary: What Is Read Preference in MongoDB and How to Configure It

## Status
validated

## Post Type
Guide

## Technologies Covered
- MongoDB (replica sets, read preference)
- MongoDB Node.js Driver (v4+/v5+/v6+)
- PyMongo (Python MongoDB driver)
- MongoDB Shell (mongosh)

## Sources Consulted
- MongoDB official documentation on Read Preference: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Node.js Driver API documentation: https://www.mongodb.com/docs/drivers/node/current/fundamentals/read-operations/read-preference/
- PyMongo documentation on ReadPreference: https://pymongo.readthedocs.io/en/stable/api/pymongo/read_preferences.html
- MongoDB Connection String URI Format: https://www.mongodb.com/docs/manual/reference/connection-string/
- MongoDB Node.js Driver AbstractCursor API (readPreference is a read-only getter, not a chainable setter)

## Issues Found
1. **Node.js code example — `.readPreference()` cursor method does not exist**: Three Node.js code examples used `.readPreference()` as a chainable method on `FindCursor`. In the MongoDB Node.js driver v4+, `readPreference` on `AbstractCursor` is a read-only getter property, not a setter method. There is no `.readPreference()` chainable cursor method. Fixed all three examples to pass `readPreference` via the `find()` options object instead, which is the correct API.

   - **First example (basic read preference):** Changed `.find({ inStock: true }).readPreference(ReadPreference.SECONDARY_PREFERRED)` to `.find({ inStock: true }, { readPreference: ReadPreference.SECONDARY_PREFERRED })`.
   - **Second example (tag sets):** Changed cursor chaining to constructing a `ReadPreference` instance with tags and passing it in find options.
   - **Third example (maxStalenessSeconds):** Changed cursor chaining to constructing a `ReadPreference` instance with `maxStalenessSeconds` option and passing it in find options.

## Review Notes
- The PyMongo example is correct — `from pymongo import ReadPreference` is a valid import, and `db.get_collection()` with `read_preference` parameter is the idiomatic PyMongo pattern.
- The five read preference modes are accurately described with correct names and semantics.
- The `maxStalenessSeconds` value of 90 used in the example is valid — it is the minimum allowed value.
- The connection string format with `readPreference=secondaryPreferred` is correct.
- The mongosh replica set tag configuration example using `rs.conf()` / `rs.reconfig()` is correct.
