# Validation Summary: How to Build a GraphQL API with Apollo Server on Azure Functions in Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL
- Apollo Server
- Apollo Server Azure Functions integration
- Azure Functions v4
- Azure Functions Core Tools
- Azure CLI
- Node.js
- TypeScript

## Sources Consulted
- Apollo Server Azure Functions deployment documentation: https://www.apollographql.com/docs/apollo-server/deployment/azure-functions
- Apollo Server cache control documentation: https://www.apollographql.com/docs/apollo-server/performance/caching
- Apollo Server cache control plugin API reference: https://www.apollographql.com/docs/apollo-server/api/plugin/cache-control
- Azure Functions local development with Core Tools documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local
- Azure Functions HTTP trigger documentation for the Node.js v4 programming model: https://learn.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook-trigger
- Azure Functions runtime versions documentation: https://learn.microsoft.com/en-us/azure/azure-functions/functions-versions
- Azure Functions Node.js developer guide: https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node

## Issues Found
- The prerequisites and deployment command used Node.js 18. The current Apollo Server Azure Functions integration requires Node.js 22 or later, so the post now specifies Node.js 22 and deploys with `--runtime-version 22`.
- The project initialization command used `func init --typescript`, which is not the current documented TypeScript v4 programming model command. It now uses `func init --worker-runtime typescript --model V4`.
- The dependency install command omitted `@azure/functions`, which is a peer dependency used directly by the example imports. It was added to the install command.
- The `books` array was inferred with `publishedYear` as a required property, but `CreateBookInput` makes `publishedYear` optional. The example now types the array with `publishedYear?: number` so `books.push(newBook)` remains valid when a mutation omits the year.
- The authentication context example used a narrow request type annotation and returned `userId: undefined` when token validation failed. The context callback now relies on the integration's inferred argument type and returns either a real `userId` or omits it.
- The cache control schema snippet used `@cacheControl` without defining the directive and enum. Apollo Server requires these definitions in the schema, so the snippet now includes `CacheControlScope` and the `@cacheControl` directive definition.

## Review Notes
- Azure Functions Core Tools was not installed in the review environment, so CLI behavior was verified against Microsoft documentation rather than local `func --help` output.
- The tutorial intentionally uses in-memory data for demonstration. That is technically valid for local examples, but production Azure Functions instances should use persistent storage because instance memory is not durable and may vary across scale-out instances.
