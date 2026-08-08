# Validation Summary: Fix Gel Client fs Resolution Errors in Next.js

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Gel and legacy EdgeDB
- Gel JavaScript/TypeScript client (`gel` and `edgedb` packages)
- EdgeQL and Gel's binary-over-HTTP transport
- Next.js App Router
- React Server Components, Client Components, and Server Actions
- Node.js and Next.js Edge runtimes
- TypeScript and JavaScript
- Webpack and Turbopack
- npm dependency inspection
- HTTP, CORS, TLS, access policies, and Gel 7 role permissions

## Sources Consulted
- [Gel JavaScript client reference](https://docs.geldata.com/reference/using/js/client) — `createClient()`, query result types, connection pools, and pool sharing through `withGlobals()`.
- [Gel connection parameters](https://docs.geldata.com/reference/using/connection) — project, environment, credential-file, DSN, and TLS resolution behavior.
- [Gel server configuration](https://docs.geldata.com/reference/running/configuration) — `cors_allow_origins`, HTTP endpoint security, and TLS defaults.
- [Gel access policies](https://docs.geldata.com/reference/datamodel/access_policies) and [Gel 7 permissions](https://docs.geldata.com/reference/datamodel/permissions) — database-enforced authorization and least-privilege roles for direct browser access.
- [Gel JavaScript package metadata](https://github.com/geldata/gel-js/blob/master/packages/gel/package.json), [browser client source](https://github.com/geldata/gel-js/blob/master/packages/gel/src/browserClient.ts), [Node client source](https://github.com/geldata/gel-js/blob/master/packages/gel/src/nodeClient.ts), and [connection-resolution source](https://github.com/geldata/gel-js/blob/master/packages/gel/src/conUtils.server.ts) — Node/browser entry mapping, `createHttpClient()`, Node API use, stateless HTTP behavior, and the Node 18 engine requirement.
- [Gel HTTP client usage in a Next.js Edge route](https://docs.geldata.com/resources/guides/tutorials/chatgpt_bot) and [Gel HTTP transport source](https://github.com/geldata/gel-js/blob/master/packages/gel/src/fetchConn.ts) — current Edge-runtime client usage and transport implementation.
- [Upgrading from EdgeDB v5 to Gel](https://docs.geldata.com/resources/upgrading) — the `edgedb`-to-`gel` package and code-generation rename.
- [Gel joins Vercel](https://www.geldata.com/blog/gel-joins-vercel) — Gel Cloud's January 31, 2026 shutdown.
- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components) — the `use client` dependency boundary, serializable props, and `server-only` behavior.
- [Next.js route runtime configuration](https://nextjs.org/docs/app/api-reference/file-conventions/route-segment-config#runtime), [Edge Runtime](https://nextjs.org/docs/app/api-reference/edge), and [Server Action runtime behavior](https://nextjs.org/docs/13/app/building-your-application/data-fetching/server-actions-and-mutations) — Node defaults, Edge restrictions, and runtime inheritance.
- [Next.js environment variables](https://nextjs.org/docs/pages/guides/environment-variables) — build-time inlining of statically referenced `NEXT_PUBLIC_` values.
- [Next.js custom Webpack configuration](https://nextjs.org/docs/pages/api-reference/config/next-config-js/webpack) and [Next.js 16 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-16) — valid `webpack(config)` syntax and Turbopack's default status.
- [npm `ls` documentation](https://docs.npmjs.com/commands/npm-ls/) — package-spec filtering used by `npm ls gel edgedb`.

## Issues Found
1. **Node runtime scope was incomplete.** The mutation guidance and repair checklist did not explicitly constrain Server Components and Server Actions to Node. Server Components can use the Edge runtime, and Server Actions inherit the runtime of their page or layout. Both passages now require the Node.js runtime for all three server-side entry points.
2. **The Webpack fallback was not a valid standalone Next.js configuration.** The snippet referenced an undefined `config` value and did not return the modified configuration. It now shows a complete `webpack(config)` callback. The surrounding text also notes that Next.js 16 defaults to Turbopack and that this callback is Webpack-only.
3. **The `NEXT_PUBLIC_` explanation was too broad.** Next.js inlines statically referenced public environment-variable values at build time; merely declaring a prefixed variable does not automatically emit it. The wording now reflects the documented behavior while preserving the warning against exposing database credentials.
4. **Browser-only HTTP requirements were presented as applying equally to Edge code.** CORS and publicly exposed end-user credentials concern direct browser access, not server-side Edge `fetch()` calls. Those bullets are now explicitly scoped to direct browser access.
5. **An official-documentation link was mislabeled.** The link titled “Gel HTTP protocol” led to the health/readiness/metrics HTTP API, not the JavaScript HTTP client transport. It was replaced with Gel's official Next.js Edge-runtime `createHttpClient()` example.
6. **The security warning referenced the retired Gel Cloud service.** Gel Cloud shut down on January 31, 2026. “Cloud secret key” was changed to the current, provider-neutral “secret key.”

## Review Notes
- The current published `gel` package reviewed was version 2.2.0. Its metadata requires Node.js 18 or newer, while Next.js 16 requires Node.js 20.9 or newer. The post correctly tells readers to satisfy both requirements without hard-coding a Next.js minimum.
- `createHttpClient(/* explicit connection options */)` is intentionally schematic. In a browser or Edge runtime, callers must replace the placeholder or provide supported environment configuration; the client cannot resolve a local Gel project file there.
- `createHttpClient()` uses Gel's binary protocol over a stateless HTTP transport. It is distinct from the separately documented `edgeql_http` JSON endpoint.
- The TypeScript, TSX, EdgeQL, npm install/list commands, package rename guidance, connection-pool explanation, runtime constants, and remaining links were verified as current and correct.
