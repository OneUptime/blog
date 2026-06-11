# Validation Summary: How to Build GraphQL Batching

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GraphQL over HTTP
- Apollo Client BatchHttpLink
- Apollo Server 4
- Express.js
- Node.js
- TypeScript
- graphql-request
- graphql-query-complexity
- prom-client / Prometheus metrics

## Sources Consulted
- Apollo Server request format and batching documentation: https://www.apollographql.com/docs/apollo-server/workflow/requests
- Apollo Server API reference for `allowBatchedHttpRequests`: https://www.apollographql.com/docs/apollo-server/api/apollo-server
- Apollo Client BatchHttpLink API reference: https://www.apollographql.com/docs/react/api/link/apollo-link-batch-http
- Apollo Server `expressMiddleware` API reference: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- GraphQL.js operation complexity controls: https://www.graphql-js.org/docs/operation-complexity-controls/
- Express body parsing middleware documentation: https://expressjs.com/en/resources/middleware/body-parser/
- graphql-request package documentation: https://www.npmjs.com/package/graphql-request
- prom-client project documentation: https://github.com/siimon/prom-client
- Node.js HTTP timeout documentation: https://nodejs.org/api/http.html

## Issues Found
- Apollo Server batching was described as enabled by default. Apollo Server 4 and 5 require `allowBatchedHttpRequests: true` for array payloads. Updated the explanation, server examples, complete example, and summary table.
- The batching configuration snippet implied `allowBatchedHttpRequests` limits batch size. It only enables batched HTTP requests. Updated the comment and kept the custom middleware as the actual batch-size limiter.
- The complete working example did not enable `allowBatchedHttpRequests`, so the provided curl batch request would fail with Apollo Server defaults. Added the option.
- The operation-aware rate limiting example read `req.body` before JSON body parsing in the endpoint wiring. Added `express.json()` before the rate limiter.
- The client-side result typing example returned GraphQL `data` envelopes but typed them as the nested field values. Updated the result interfaces and usage to match the actual response shape.
- Several standalone TypeScript snippets had unused or missing imports (`ApolloLink`, `GraphQLClient`, `GraphQLError`, `Readable`, `Gauge`, and Express types). Removed unused imports and added the needed Express imports.
- The custom `BatchTransport` used `NodeJS.Timeout`, which is not portable to browser TypeScript environments without Node typings. Replaced it with `ReturnType<typeof setTimeout>`.

## Review Notes
The article covers HTTP operation batching, not resolver-level batching. The final DataLoader note correctly distinguishes field-level batching from combining multiple GraphQL operations into one HTTP request.
