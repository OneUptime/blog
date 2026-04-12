# Validation Summary: How to Store and Validate API Keys in MongoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (TTL indexes, sparse indexes, query operators)
- Mongoose (schema definitions, model methods, index creation)
- Node.js (crypto module, async/await)
- bcrypt (password/key hashing and comparison)
- Express.js (middleware pattern)

## Sources Consulted
- Mongoose Schema documentation: https://mongoosejs.com/docs/guide.html
- Mongoose Indexes documentation: https://mongoosejs.com/docs/guide.html#indexes
- MongoDB TTL Indexes documentation: https://www.mongodb.com/docs/manual/core/index-ttl/
- MongoDB Sparse Indexes documentation: https://www.mongodb.com/docs/manual/core/index-sparse/
- Node.js crypto.randomBytes documentation: https://nodejs.org/api/crypto.html#cryptorandombytessize-callback
- bcrypt npm package documentation: https://www.npmjs.com/package/bcrypt

## Issues Found
1. **Duplicate index on `expiresAt` field**: The schema defined `expiresAt` with `index: true` at the field level, which creates a standard ascending index. Separately, `apiKeySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true })` creates a TTL index on the same field. MongoDB does not allow two indexes on the same key pattern with different options, so the second `createIndex` call would fail. **Fix**: Removed `index: true` from the `expiresAt` field definition, since the TTL index created at the schema level already provides indexing on that field.

## Review Notes
- The `.select('+keyHash')` in `validateApiKey` uses the `+` prefix, which is designed for overriding `select: false` at the schema level. Since `keyHash` does not have `select: false` in the schema, the `+` is redundant (though not harmful). For full consistency, the author could add `select: false` to `keyHash` in the schema definition, which would make the `+keyHash` override meaningful and prevent accidental keyHash leakage in other queries. This is a design improvement, not a bug.
- The prefix always starts with `sk_`, so only 5 of the 8 prefix characters are variable (hex digits), yielding ~1 million possible prefixes. This is sufficient for most use cases but worth noting for very high-scale deployments.
- The `authorization?.replace('Bearer ', '')` approach is simple but case-sensitive. Per RFC 6749, the token type is case-insensitive, but in practice "Bearer" is almost universally capitalized. Not a bug, but worth noting.
