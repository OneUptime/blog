# Validation Summary: How to Build Queries in MongoDB Compass

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Compass (GUI query builder)
- MongoDB Query Language (MQL)
- MongoDB Node.js Driver
- PyMongo (Python MongoDB Driver)
- MongoDB Java Driver

## Sources Consulted
- MongoDB Compass documentation: https://www.mongodb.com/docs/compass/current/query/filter/
- MongoDB Node.js Driver `find()` API: https://www.mongodb.com/docs/drivers/node/current/usage-examples/find/
- PyMongo `Collection.find()` API: https://pymongo.readthedocs.io/en/stable/api/pymongo/collection.html#pymongo.collection.Collection.find
- MongoDB Java Driver API: https://www.mongodb.com/docs/drivers/java/sync/current/usage-examples/find/
- MongoDB `$all` operator docs: https://www.mongodb.com/docs/manual/reference/operator/query/all/
- MongoDB `$regex` operator docs: https://www.mongodb.com/docs/manual/reference/operator/query/regex/

## Issues Found
1. **Incorrect claim about real-time results (line 12):** The post stated "Results update as you type, giving immediate feedback," but Compass does not auto-execute queries while typing. You must click Find or press Enter, which the post itself correctly states in the next section. Fixed to: "Compass validates your syntax as you type and executes the query when you click Find or press Enter."

2. **Java projection includes `excludeId()` not in original query (line 100):** The Java code example used `fields(include("name", "price"), excludeId())` but the original query projection was `{ "name": 1, "price": 1 }`, which does NOT exclude `_id`. The `excludeId()` call changes the query behavior compared to the other language examples. Fixed to `include("name", "price")` without `excludeId()`.

3. **Incorrect description of `$all` operator (line 121):** The post described `$all` as querying "documents where all array values match a condition." The `$all` operator actually selects documents where the array field contains all of the specified values — a different semantic. Fixed to: "documents where the array contains all specified values."

## Review Notes
- The Node.js driver example passes `sort` and `limit` inside the options object of `find()`. This works but differs from the more common chaining style (`find().sort().limit()`). Both are valid.
- The Python example correctly uses keyword arguments and the list-of-tuples format for `sort`, which is the canonical PyMongo style.
- The post could benefit from mentioning the Aggregation tab in Compass for more complex queries, but this is outside the stated scope.
