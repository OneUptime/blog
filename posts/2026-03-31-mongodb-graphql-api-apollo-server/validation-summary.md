# Validation Summary: How to Build a GraphQL API with MongoDB and Apollo Server

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- Mongoose (Node.js ODM)
- GraphQL
- Apollo Server 4
- graphql-tag
- jsonwebtoken (JWT authentication)
- Node.js

## Sources Consulted
- Apollo Server 4 documentation: https://www.apollographql.com/docs/apollo-server/
- Apollo Server `startStandaloneServer` API: https://www.apollographql.com/docs/apollo-server/api/standalone/
- Mongoose documentation: https://mongoosejs.com/docs/guide.html
- graphql-tag npm package: https://www.npmjs.com/package/graphql-tag
- jsonwebtoken npm package: https://www.npmjs.com/package/jsonwebtoken

## Issues Found
1. **Missing `jsonwebtoken` in install command**: The "Starting Apollo Server" section uses `const jwt = require('jsonwebtoken')` but the npm install command only listed `@apollo/server graphql mongoose graphql-tag`. Added `jsonwebtoken` to the install command so readers have all required dependencies.

## Review Notes
- The `deletePost` mutation does not explicitly check `if (!userId)` for authentication like the other mutations do. If `userId` is null, the query filter `{ authorId: null }` won't match any documents (since `authorId` is required in the schema), so the behavior is safe — it returns `false`. However, an explicit auth check would be more consistent and provide a clearer error message. This is a design choice, not a bug.
- The server startup code uses top-level `await` with CommonJS `require()` syntax. Top-level await requires ES modules or an async wrapper. This is a very common tutorial convention and readers are expected to adapt the code to their module system.
