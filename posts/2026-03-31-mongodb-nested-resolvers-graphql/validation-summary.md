# Validation Summary: How to Handle Nested Resolvers with MongoDB in GraphQL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB (with Mongoose ODM)
- GraphQL (SDL schema definition)
- Apollo Server 4 (`ApolloServer`, `startStandaloneServer`)
- DataLoader (batch loading and caching)
- graphql-depth-limit (query depth validation)
- Node.js / JavaScript

## Sources Consulted
- Apollo Server 4 API Reference — `ApolloServer` constructor options including `validationRules`: https://www.apollographql.com/docs/apollo-server/api/apollo-server
- Apollo Server 4 `startStandaloneServer` API — `context` function option: https://www.apollographql.com/docs/apollo-server/api/standalone
- DataLoader GitHub repository — batch function contract (same-length, same-order): https://github.com/graphql/dataloader
- graphql-depth-limit npm package: https://www.npmjs.com/package/graphql-depth-limit
- Mongoose `.lean()` documentation: https://mongoosejs.com/docs/tutorials/lean.html
- Mongoose `Schema.Types.ObjectId` and `ref` documentation: https://mongoosejs.com/docs/populate.html

## Issues Found
1. **`Comment.post` resolver bypassed DataLoader (N+1 query bug):** The `Comment.post` resolver called `Post.findById(comment.postId).lean()` directly instead of using a DataLoader. This creates an N+1 query problem when multiple comments are resolved — each one issues a separate MongoDB query for its parent post. This directly contradicts the article's core teaching that every relationship should be resolved through a DataLoader. **Fix:** Added a `post` DataLoader (identical in structure to the `user` loader) to the `createLoaders` function, and updated the `Comment.post` resolver to use `loaders.post.load(comment.postId.toString())`.

## Review Notes
- The `tagsByIds` DataLoader uses arrays as keys. DataLoader's default cache key function uses reference equality, so two different array instances with the same tag IDs would not share a cache entry. This is not a bug (batching still works correctly within a single tick), but if caching across calls matters, a custom `cacheKeyFn` (e.g., `JSON.stringify`) could be provided. This is a minor optimization concern, not an error.
- The `limit` arguments on `User.posts` and `Post.comments` are applied client-side via `.slice()` after fetching all matching documents. For large datasets this could be inefficient — a server-side limit in the MongoDB query would be better. However, this is a design trade-off inherent to the DataLoader batching pattern (where multiple parents share one query), not a correctness issue.
