# Validation Summary: How to Create GraphQL Security Best Practices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL (graphql-js)
- Apollo Server v4 (`@apollo/server`, `@apollo/server/express4`, `@apollo/server/plugin/disabled`)
- Custom `GraphQLScalarType` (parseValue / parseLiteral / serialize)
- Zod
- `sanitize-html`
- `graphql-depth-limit`
- `graphql-query-complexity`
- Express middleware
- Helmet
- CORS
- Automatic Persisted Queries (APQ) / persisted operation allowlisting
- Node.js `crypto`
- `glob`
- TypeScript

## Sources Consulted
- Apollo Server docs — request format and batching (`allowBatchedHttpRequests`): https://www.apollographql.com/docs/apollo-server/workflow/requests
- Apollo Server docs — plugin lifecycle and response hooks: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server docs — `formatError`, introspection toggle, and Express middleware API: https://www.apollographql.com/docs/apollo-server/
- Apollo Server docs — APQ protocol (`extensions.persistedQuery.sha256Hash`, version 1): https://www.apollographql.com/docs/apollo-server/performance/apq/
- Apollo GraphOS docs — persisted queries as operation safelisting: https://www.apollographql.com/docs/graphos/routing/security/persisted-queries
- GraphQL.org security guide — trusted documents, depth limiting, batch limiting, introspection, error messages, and validation: https://graphql.org/learn/security/
- GraphQL.js docs — custom scalars (`GraphQLScalarType`, parse/serialize hooks): https://www.graphql-js.org/docs/custom-scalars/
- `graphql-depth-limit` README: https://github.com/stems/graphql-depth-limit
- `graphql-query-complexity` README: https://github.com/slicknode/graphql-query-complexity
- Zod docs: https://zod.dev/
- `sanitize-html` README: https://github.com/apostrophecms/sanitize-html
- Helmet README: https://github.com/helmetjs/helmet
- `cors` middleware README: https://github.com/expressjs/cors
- RFC 5321 email length constraints: https://datatracker.ietf.org/doc/html/rfc5321

## Issues Found
1. **Wrong complexity-rule import and signature in section 9.**
   - The post used `createComplexityLimitRule`, but `graphql-query-complexity` exports `createComplexityRule`.
   - Fixed the import and changed the call to `createComplexityRule({ maximumComplexity, estimators, onComplete })`.
2. **The introspection plugin used `GraphQLError` without importing it and only checked top-level fields.**
   - Fragment-based introspection could bypass the original check.
   - Fixed by importing `GraphQLError` and `visit` from `graphql`, then walking all `Field` nodes.
3. **The batching plugin example checked `Array.isArray(request)`, which is not how Apollo exposes HTTP batch payloads to plugins.**
   - Apollo Server requires `allowBatchedHttpRequests: true` to accept HTTP batches, and batch-size enforcement should happen before Apollo middleware.
   - Replaced the plugin example with Express middleware guidance, parsed GraphQL documents to count operations, and enabled `allowBatchedHttpRequests: true` in the complete setup.
4. **The batch middleware referenced `req.user` before any shown middleware populated it.**
   - Changed the anonymous-batch check to use the `Authorization` header at the HTTP middleware layer.
5. **The CORS origin callback passed a possibly undefined origin to `allowedOrigins.includes(...)`.**
   - Added an `origin &&` guard.
6. **The Helmet configuration used old option names.**
   - Updated `frameguard`, `hidePoweredBy`, `hsts`, `noSniff`, and `xssFilter` to current Helmet option names.
7. **The audit logging plugin used `response.errors`, which does not match Apollo Server v4 response bodies.**
   - Fixed the example to read errors from `response.body.singleResult` or `response.body.initialResult`.

## Review Notes
- The custom `disableIntrospectionPlugin` is still redundant with `introspection: process.env.NODE_ENV !== 'production'`; Apollo's built-in option is the simpler production control.
- The custom persisted-query plugin overlaps with Apollo Server's built-in APQ behavior. For a real operation safelist, production should only execute pre-registered operation hashes.
- Helmet's `xXssProtection: true` sets the legacy `X-XSS-Protection: 0` behavior. CSP is the meaningful modern XSS mitigation.
- The `Email` scalar's 254-character ceiling matches RFC 5321's practical email-address length limit. The regex is a pragmatic subset of the full email grammar.
- The `redactVariables` function only redacts top-level keys; nested credential fields should be redacted in production code.
