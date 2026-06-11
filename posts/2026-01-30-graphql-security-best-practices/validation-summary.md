# Validation Summary: How to Create GraphQL Security Best Practices

## Status
validated

## Post Type
Tutorial / Guide — a practical, code-first walkthrough of layered security techniques for a GraphQL API built with Apollo Server v4 on Node.js/TypeScript.

## Technologies Covered
- GraphQL (graphql-js)
- Apollo Server v4 (`@apollo/server`, `@apollo/server/express4`, `@apollo/server/plugin/disabled`)
- Custom `GraphQLScalarType` (parseValue / parseLiteral / serialize)
- Zod (schema validation)
- `sanitize-html`
- `graphql-depth-limit`
- `graphql-query-complexity` (`createComplexityRule`, estimators)
- Express middleware (CORS, JSON body parser)
- Helmet (CSP, HSTS, frameguard, etc.)
- Automatic Persisted Queries (APQ) protocol (`extensions.persistedQuery.sha256Hash`)
- Node `crypto` (`createHash`) for SHA-256 query hashing
- `glob` and `graphql` `parse`/`print` for build-time query extraction

## Sources Consulted
- Apollo Server v4 docs — plugins, request lifecycle, `formatError`, introspection toggle, `expressMiddleware`: https://www.apollographql.com/docs/apollo-server/
- `@apollo/server/plugin/disabled` (`ApolloServerPluginLandingPageDisabled`): https://www.apollographql.com/docs/apollo-server/api/plugin/landing-pages/
- Apollo APQ protocol (`extensions.persistedQuery.sha256Hash`, version 1): https://www.apollographql.com/docs/apollo-server/performance/apq/
- `graphql-js` `GraphQLScalarType` interface (parseValue / parseLiteral / serialize, `Kind` constants): https://graphql.org/graphql-js/type/#graphqlscalartype
- `graphql-depth-limit` README — `depthLimit(maxDepth)` returns a validation rule: https://github.com/stems/graphql-depth-limit
- `graphql-query-complexity` README — exports `createComplexityRule({ maximumComplexity, estimators, onComplete })`: https://github.com/slicknode/graphql-query-complexity
- Zod docs — `.string().email()`, `.regex()`, `.transform()`, `.safeParse()`, `error.issues`: https://zod.dev/
- `sanitize-html` README — `allowedTags`, `allowedAttributes` options: https://github.com/apostrophecms/sanitize-html
- Helmet docs — `contentSecurityPolicy`, `hsts`, `frameguard`, `hidePoweredBy`, `noSniff`, `xssFilter` options: https://helmetjs.github.io/
- `cors` middleware README — origin callback, methods, credentials, maxAge: https://github.com/expressjs/cors
- RFC 5321 — email local-part + domain length ceiling of 254 octets (per the path limit of 256 minus angle brackets): https://datatracker.ietf.org/doc/html/rfc5321

## Issues Found
1. **Wrong complexity-rule import and signature in section 9 (Complete Security Setup).**
   - The post imported `createComplexityLimitRule` from `graphql-query-complexity` and called it as `createComplexityLimitRule(1000, { estimators, onComplete })`.
   - `graphql-query-complexity` does not export `createComplexityLimitRule`; the actual export is `createComplexityRule`, which takes a single options object whose `maximumComplexity` field carries the limit. The `createComplexityLimitRule` name belongs to the unrelated `graphql-validation-complexity` package, which does not accept the `estimators` option.
   - Fixed by changing the named import to `createComplexityRule` and rewriting the call to `createComplexityRule({ maximumComplexity: 1000, estimators: [...], onComplete: ... })`.

## Review Notes
- The custom `disableIntrospectionPlugin` is functionally redundant with `introspection: process.env.NODE_ENV !== 'production'` (Apollo Server already strips `__schema`/`__type` access when `introspection: false`), but it is not incorrect and demonstrates the plugin-level approach the author is teaching. Left as-is.
- The custom persisted-query plugin overlaps with Apollo Server's built-in APQ. In practice you would disable Apollo's APQ cache (`persistedQueries: false`) when using a hand-rolled allowlist store; the post does not call this out, but the plugin itself runs in `requestDidStart` before parsing, so reassigning `request.query` is a legitimate technique.
- Helmet's `xssFilter: true` is accepted by all current Helmet versions, but the underlying `X-XSS-Protection` header is a legacy control — modern browsers ignore it and OWASP recommends relying on CSP instead. The code is not wrong, just slightly dated guidance.
- The `Email` scalar's 254-character ceiling matches RFC 5321's practical email-address length limit. The regex is intentionally a pragmatic subset of RFC 5322, and the post says so.
- The `PositiveInt` scalar's `value > Number.MAX_SAFE_INTEGER` check is defensive: `Number.isInteger` does return `true` for safe-integer-exceeding whole-number floats (e.g. `1e20`), so the check has a purpose.
- `parseLiteral` uses `this.parseValue(ast.value)` — this works at runtime because graphql-js calls these methods on the scalar instance, but strict TS users may need `this: GraphQLScalarType` annotations to silence implicit-any warnings. Not a correctness issue.
- The `redactVariables` function only redacts top-level keys; nested credential fields in input objects would slip through. Acceptable for an illustrative example but worth tightening in real code.
