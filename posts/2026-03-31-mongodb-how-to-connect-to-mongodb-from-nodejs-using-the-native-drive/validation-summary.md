# Validation Summary: How to Connect to MongoDB from Node.js Using the Native Driver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Node.js
- MongoDB Node.js Native Driver (`mongodb` npm package)
- Express.js

## Sources Consulted
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/
- MongoDB Node.js Driver API reference (MongoClient, Collection, Db): https://mongodb.github.io/node-mongodb-native/6.0/
- MongoDB Manual (CRUD operations, aggregation): https://www.mongodb.com/docs/manual/
- Mongoose documentation (to verify ODM vs ORM terminology): https://mongoosejs.com/

## Issues Found
- **ORM vs ODM terminology**: The Overview section described Mongoose as a "higher-level ORM." Mongoose is an ODM (Object Document Mapper), not an ORM (Object Relational Mapper). ORMs map objects to relational database tables, while ODMs map objects to document-oriented databases like MongoDB. Changed "ORMs" to "ODMs."

## Review Notes
- All code examples use correct, current APIs for the MongoDB Node.js driver (v6.x).
- The `MongoClient` options (`maxPoolSize`, `serverSelectionTimeoutMS`) are valid and current.
- The `client.connect()` call is explicit, which is good practice for startup validation even though the driver auto-connects on first operation since v4.7.
- The `find()` projection syntax using the second options argument is correct for the native driver.
- The Express.js example uses `new ObjectId(req.params.id)` which will throw a `BSONError` on invalid input — acceptable for a tutorial but production code should add input validation.
- CommonJS `require()` syntax is used throughout, which is still fully supported. ESM `import` is also available but not required.
