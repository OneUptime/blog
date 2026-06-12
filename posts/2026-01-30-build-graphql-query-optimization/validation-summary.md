# Validation Summary: How to Build GraphQL Query Optimization

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- GraphQL
- GraphQL.js
- TypeScript
- Express
- Apollo Server
- GraphQL Tools
- Jest-style tests
- Mermaid diagrams

## Sources Consulted
- GraphQL.js language API documentation: https://www.graphql-js.org/api-v16/language/
- GraphQL.js type API documentation: https://www.graphql-js.org/api-v16/type/
- GraphQL.js validation API documentation: https://www.graphql-js.org/api-v16/validation/
- GraphQL.js utilities and TypeInfo documentation: https://www.graphql-js.org/api-v16/utilities/
- Apollo Server API reference: https://www.apollographql.com/docs/apollo-server/api/apollo-server
- Apollo Server Express middleware documentation: https://github.com/apollographql/apollo-server/blob/main/docs/source/api/express-middleware.mdx
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- GraphQL Specification, October 2021: https://spec.graphql.org/October2021/

## Issues Found
- The optimization middleware claimed to execute rewritten queries, but it only stored the optimized document in request metadata. Updated the middleware to set `req.body.query = print(optimizedDocument)` after a successful rewrite so Apollo's `expressMiddleware` receives the rewritten query.
- The query rewriter could add arguments that make a query invalid for the schema, while the middleware only validated the original query. Added schema validation for the rewritten document and skipped applying invalid rewrites.
- The middleware snippet needed `print` from `graphql` after changing the request query to the rewritten document. Updated the import.
- The depth limiter and query rewriter snippets included unused imports that can fail TypeScript builds when `noUnusedLocals` is enabled. Removed `FieldNode`, `visit`, `SelectionSetNode`, and `parse` where they were not used.
- The Apollo monitoring plugin recorded `wasRewritten` as true when optimization metadata was absent because `undefined !== null` evaluates to true. Changed this to `Boolean(optimization?.rewrite)`.
- The Apollo monitoring plugin accessed `context.response.body.singleResult` without narrowing the response body kind, which is not type-safe for Apollo Server responses that may use incremental delivery. Added a `kind === 'single'` check before reading `singleResult`.
- The monitoring plugin had unused hook parameters that can fail stricter TypeScript configurations. Removed the unused parameter names from `requestDidStart` and `didResolveOperation`.

## Review Notes
The examples are educational infrastructure rather than a drop-in production package. The remaining analyzer and rewriter implementations intentionally use simplified heuristics, especially around fragment type conditions, interfaces/unions, list-size inference, multiple operations, and schema-aware rewrite decisions. These caveats do not make the post technically invalid, but production systems should handle them before enforcing query limits or automatic rewrites at scale.
