# Validation Summary: How to Fix 'Maximum Query Depth' Errors in GraphQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL
- Apollo Server
- graphql-depth-limit
- graphql-validation-complexity
- DataLoader
- JavaScript / Node.js

## Sources Consulted
- GraphQL Security documentation: https://graphql.org/learn/security/
- GraphQL Validation documentation: https://graphql.org/learn/validation/
- GraphQL.js validation API documentation: https://www.graphql-js.org/api-v16/validation/
- Apollo Server API reference: https://www.apollographql.com/docs/apollo-server/api/apollo-server
- Apollo Server error handling documentation: https://www.apollographql.com/docs/apollo-server/data/errors
- graphql-depth-limit package documentation and source: https://www.npmjs.com/package/graphql-depth-limit
- graphql-validation-complexity package documentation: https://www.npmjs.com/package/graphql-validation-complexity
- DataLoader package documentation: https://www.npmjs.com/package/dataloader

## Issues Found
- The `graphql-depth-limit` callback was shown as `options.callback`, but the package API accepts the callback as the third argument: `depthLimit(maxDepth, options, callback)`. Updated the examples to use the documented function signature.
- The callback description said it is called only when a query exceeds the depth limit and maps field names to depths. The package calls it whenever validation runs and maps operation names to depths. Updated the comments accordingly.
- The validation error response included `"data": null`. For validation/request errors, GraphQL responses normally omit `data` because execution does not occur. Updated the example response to show only `errors`.
- The custom error example attempted to wrap `graphql-depth-limit` by catching thrown errors from the validation visitor. The package reports validation errors through `context.reportError` instead. Replaced the wrapper with Apollo Server `formatError`, which is the documented way to transform outgoing error responses.
- The DataLoader section implied DataLoader reduces GraphQL query depth. DataLoader batches and caches backend loads; it does not change the client operation's depth. Updated the wording and comments to describe resolver/backend load reduction.
- The post used "endpoints" for GraphQL schema fields. Updated the affected heading and comments to "query fields" for GraphQL terminology accuracy.
- The related OneUptime links were checked and returned HTTP 200 responses.

## Review Notes
The Apollo Server examples use the current `@apollo/server` package style, and Apollo's current API reference still documents `validationRules` and `formatError`. The `graphql-depth-limit` package is functional but relatively old; future updates could consider newer depth-limit libraries if the project standardizes on one.
