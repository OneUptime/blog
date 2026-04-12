# Validation Summary: How to Implement JWT Authentication with MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (Native Node.js Driver)
- Express.js
- JSON Web Tokens (jsonwebtoken library)
- bcrypt (native C++ binding)
- Node.js
- dotenv

## Sources Consulted
- jsonwebtoken npm documentation: https://www.npmjs.com/package/jsonwebtoken — verified `jwt.sign()` options (`expiresIn` string format "15m", "7d"), `jwt.verify()` synchronous and callback usage
- bcrypt npm documentation: https://www.npmjs.com/package/bcrypt — verified `bcrypt.hash(data, saltRounds)` and `bcrypt.compare()` API
- MongoDB Node.js Driver documentation: https://www.mongodb.com/docs/drivers/node/current/ — verified `MongoClient`, `ObjectId`, `findOne` with projection options, `insertOne`, `deleteOne`, `createIndex`
- MongoDB TTL Index documentation: https://www.mongodb.com/docs/manual/core/index-ttl/ — verified `expireAfterSeconds: 0` behavior (expire at the date specified in the indexed field)
- Express.js documentation: https://expressjs.com/en/api.html — verified middleware pattern, `express.json()`, route handler signatures

## Issues Found
- **Incorrect pattern terminology in description**: The description stated "token revocation using a denylist pattern," but the implementation is actually an **allowlist pattern**. The code stores valid refresh tokens in MongoDB and checks for their existence during refresh. On logout, the token is deleted — absence means revoked. A denylist pattern would instead store *revoked* tokens and reject matches. Changed "denylist" to "allowlist" in the description line.

## Review Notes
- The code uses top-level `await` (e.g., `await mongo.connect()`) alongside CommonJS `require()` syntax. Top-level await requires ES modules. This is acceptable in a tutorial context where snippets are illustrative, but readers assembling a complete file should either wrap the code in an `async main()` function or switch to ES module syntax (`import`).
- Storing the raw refresh token string in MongoDB is a common tutorial simplification. In production, hashing the refresh token before storage (similar to password hashing) would be more secure, preventing token theft if the database is compromised.
- The `bcrypt` package requires native build tools (node-gyp). Readers on systems without a C++ toolchain may prefer `bcryptjs` as a pure-JavaScript alternative with the same API.
- Optional catch binding (`catch {` without a parameter) in the refresh endpoint is valid ES2019+ syntax — correct and intentional.
