# Validation Summary: How to Use Dapr with Next.js and Dapr Service Invocation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, service invocation, state management, pub/sub)
- Next.js (Pages Router, API routes, `getServerSideProps`)
- Node.js / TypeScript
- `@dapr/dapr` Node.js SDK
- Dapr CLI (`dapr run`)

## Sources Consulted
- Dapr JavaScript Client SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- `@dapr/dapr` npm package: https://www.npmjs.com/package/@dapr/dapr
- Dapr JS SDK GitHub repository: https://github.com/dapr/js-sdk
- Dapr JavaScript SDK examples: https://docs.dapr.io/developing-applications/sdks/js/js-examples/
- Next.js Pages Router API Routes documentation: https://nextjs.org/docs/pages/building-your-application/routing/api-routes
- Next.js `getServerSideProps` documentation: https://nextjs.org/docs/pages/building-your-application/data-fetching/get-server-side-props

## Issues Found
No technical issues found.

## Review Notes
- The `DaprClient` constructor usage with `{ daprHost, daprPort }` is correct per the SDK API. Creating `new DaprClient()` with no arguments (used in the state and SSR examples) is also valid and uses SDK defaults (`127.0.0.1:3500`).
- The `invoker.invoke(appId, method, httpMethod, body?)` signature is correct.
- The `pubsub.publish(pubsubName, topic, data)` and `state.get(storeName, key)` signatures are correct.
- The `dapr run` CLI command with `--app-id`, `--app-port`, `--dapr-http-port`, and `-- npm run dev` is correct syntax.
- The post uses the Next.js Pages Router (`pages/api/...`, `getServerSideProps`). While Next.js 13+ introduced the App Router as the recommended approach, the Pages Router remains fully supported and is not deprecated. This is a valid architectural choice and does not constitute an error.
- The custom environment variables `DAPR_HTTP_HOST` and `DAPR_HTTP_PORT` are user-defined fallbacks passed to the constructor, not official Dapr env vars. This is a reasonable pattern and clearly shown in the code.
