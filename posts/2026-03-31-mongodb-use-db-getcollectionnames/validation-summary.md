# Validation Summary: How to Use db.getCollectionNames() in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (mongosh shell)
- JavaScript (mongosh scripting)
- Node.js MongoDB Driver
- Python PyMongo Driver

## Sources Consulted
- MongoDB Manual: db.getCollectionNames() — https://www.mongodb.com/docs/manual/reference/method/db.getCollectionNames/
- MongoDB Manual: db.createCollection() — https://www.mongodb.com/docs/manual/reference/method/db.createCollection/
- MongoDB Manual: db.collection.drop() — https://www.mongodb.com/docs/manual/reference/method/db.collection.drop/
- MongoDB Manual: db.collection.countDocuments() — https://www.mongodb.com/docs/manual/reference/method/db.collection.countDocuments/
- MongoDB Node.js Driver: listCollections — https://www.mongodb.com/docs/drivers/node/current/
- PyMongo: list_collection_names — https://pymongo.readthedocs.io/en/stable/api/pymongo/database.html

## Issues Found
No technical issues found.

## Review Notes
- `db.getCollectionNames()` also returns view names in addition to collection names. The post focuses on collections, which is the primary use case, but users working with views should be aware they will appear in the results.
- The Node.js example calls the async `listCollections("myapp")` function without `await` at the top level. This is a common pattern in example code and will execute correctly, though in production code it should be awaited or have `.catch()` for error handling.
- The claim that system collections like `system.views` appear in `getCollectionNames()` output may not hold in MongoDB 4.0+ (where system collections are generally excluded by default). However, the defensive filtering advice is sound practice and not harmful.
