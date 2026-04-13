# Validation Summary: How to Use forEach, toArray, and map with Cursors in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (shell / mongosh)
- MongoDB Node.js Driver (v5+/v6+)
- JavaScript / Node.js (async iteration, async generators)

## Sources Consulted
- MongoDB Node.js Driver API documentation for `FindCursor`, `AbstractCursor` — https://mongodb.github.io/node-mongodb-native/6.0/classes/FindCursor.html
- MongoDB Node.js Driver API documentation for `AbstractCursor.map()` — https://mongodb.github.io/node-mongodb-native/6.0/classes/AbstractCursor.html#map
- MongoDB Node.js Driver API documentation for `AbstractCursor.forEach()` — https://mongodb.github.io/node-mongodb-native/6.0/classes/AbstractCursor.html#forEach
- MongoDB Shell (mongosh) cursor documentation — https://www.mongodb.com/docs/manual/reference/method/js-cursor/
- MDN Web Docs: `for await...of` — https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/for-await...of

## Issues Found
1. **`map()` incorrectly described as shell-only**: The post stated that `map()` is only available on cursor objects in the MongoDB shell, and told Node.js users to use `toArray()` combined with `Array.map()`. In fact, the MongoDB Node.js driver's `AbstractCursor` class (parent of `FindCursor`) provides a `map()` method that returns a mapped cursor applying the transform as documents are iterated. Fixed the section to show the driver's `cursor.map()` chained with `.toArray()`, and updated the introductory text to note availability in both shell and driver.

2. **Comparison table mislabeled `map()`**: The table described `map()` as "Shell utility, transforms while streaming; use array.map in drivers". Updated to "Transforms while streaming, available in both shell and Node.js driver".

## Review Notes
- The warning about `forEach()` not properly awaiting async callbacks is accurate and important. The driver's `forEach` callback signature is `(doc: TSchema) => boolean | void` — it does not await returned promises. The post correctly recommends `for await...of` as the preferred alternative.
- `client.connect()` is called explicitly in all examples. While this is still valid, in driver v4.7+ it is called automatically on first operation. This is fine — explicit connect is not deprecated and is a common pattern.
- The async generator pattern shown for streaming map is a valid and useful pattern, correctly retained in the post.
