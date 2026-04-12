# Validation Summary: How to Use Replica Set Tags for Read Preference Routing in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB replica sets
- MongoDB replica set tags and read preference routing
- MongoDB Node.js driver (`mongodb` npm package)
- PyMongo (Python MongoDB driver)
- MongoDB connection string URI options
- Custom write concern modes (`getLastErrorModes`)

## Sources Consulted
- MongoDB documentation on replica set tags: https://www.mongodb.com/docs/manual/tutorial/configure-replica-set-tag-sets/
- MongoDB documentation on read preference: https://www.mongodb.com/docs/manual/core/read-preference/
- MongoDB Node.js driver API reference for ReadPreference: https://mongodb.github.io/node-mongodb-native/
- PyMongo documentation for read_preferences module: https://pymongo.readthedocs.io/en/stable/api/pymongo/read_preferences.html
- MongoDB documentation on custom write concern with getLastErrorModes: https://www.mongodb.com/docs/manual/reference/replica-configuration/#mongodb-rsconf-rsconf.settings.getLastErrorModes

## Issues Found

1. **Missing `ReadPreference` import in Node.js example**: The code used `ReadPreference` without importing it. Fixed by changing `const { MongoClient } = require('mongodb')` to `const { MongoClient, ReadPreference } = require('mongodb')`.

2. **Invalid `ReadPreference.secondary()` static method**: The Node.js driver does not have static factory methods like `ReadPreference.secondary()`. The correct API is `new ReadPreference('secondary', tagSets)`. Fixed in the main Node.js example.

3. **`Collection.withReadPreference()` does not exist**: The Node.js driver's `Collection` class does not have a `withReadPreference()` method. Restructured the example to pass `readPreference` as an option to `find()`.

4. **Invalid `ReadPreference.secondaryPreferred()` static method in fallback example**: Same issue as #2. Fixed to use `new ReadPreference('secondaryPreferred', [...])`.

5. **Invalid `ReadPreference.nearest()` static method in nearest routing example**: Same issue as #2. Fixed to use `new ReadPreference('nearest', [...])`.

6. **Incorrect advice about removing tags**: The post claimed that removing a tag requires setting it to an empty string. This is wrong — setting a tag to `""` keeps the tag with an empty string value, which still participates in tag matching. The correct approach is to omit the key from the tags document entirely. Fixed the explanation and code example.

## Review Notes
- The PyMongo example is correct: `Secondary(tag_sets)` from `pymongo.read_preferences` properly accepts a list of tag set dicts as its first positional argument.
- The `rs.reconfig()` examples for setting tags and `getLastErrorModes` are correct.
- The connection string examples for `readPreferenceTags` (including fallback with empty value) are correct per the MongoDB connection string specification.
- The explanation of tag set matching semantics (member must have ALL key-value pairs) is accurate.
- The `getLastErrorModes` field name is technically a legacy name, but it remains the current and correct field name in the replica set configuration even in MongoDB 7.x+.
