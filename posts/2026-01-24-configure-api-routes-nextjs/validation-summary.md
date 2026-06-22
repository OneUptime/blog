# Validation Summary: How to Configure API Routes in Next.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js Pages Router API Routes
- Next.js App Router Route Handlers
- Next.js Proxy
- JavaScript
- REST APIs
- CORS
- Rate limiting
- File uploads with Formidable
- API route testing with node-mocks-http

## Sources Consulted
- Next.js API Routes documentation: https://nextjs.org/docs/pages/building-your-application/routing/api-routes
- Next.js Route Handlers documentation: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js dynamic API warning: https://nextjs.org/docs/messages/sync-dynamic-apis
- Next.js `headers` function documentation: https://nextjs.org/docs/app/api-reference/functions/headers
- Next.js `cookies` function documentation: https://nextjs.org/docs/app/api-reference/functions/cookies
- Next.js Proxy documentation: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js middleware-to-proxy migration note: https://nextjs.org/docs/messages/middleware-to-proxy
- Next.js `next.config.js` headers documentation: https://nextjs.org/docs/app/api-reference/config/next-config-js/headers
- Formidable npm package documentation: https://www.npmjs.com/package/formidable
- node-mocks-http npm package documentation: https://www.npmjs.com/package/node-mocks-http

## Issues Found
- The introduction described all Next.js API handlers as "serverless functions." This is deployment-dependent and not how the current Next.js docs frame both Pages API Routes and App Router Route Handlers. Changed it to "server-side handlers."
- App Router dynamic route examples accessed `params` synchronously. In current Next.js, route handler `params` is a promise and should be awaited. Updated the `[id]` and `[...slug]` route handler examples to use `await params`.
- The App Router query example called `headers()` and `cookies()` synchronously. In current Next.js, both APIs are asynchronous. Updated the example to `await headers()` and `await cookies()`.
- The App Router middleware example used the deprecated `middleware.js` convention and `middleware` export. Current Next.js has renamed this convention to Proxy. Updated the heading, filename comment, and function export to `proxy.js` and `proxy`.
- The in-memory rate limiter could be misleading for serverless or multi-instance deployments. Added a concise caveat that a shared external store such as Redis is needed for consistent limits across instances.
- The rate limiter snippet declared an unused `windowStart` variable. Removed it.
- The test examples expected a wrapped `{ data: ... }` response shape, but the earlier `pages/api/users` example returns raw users and raw created user objects. Updated the assertions to match the shown handler response shape.

## Review Notes
- The snippets still use placeholder application functions such as `getAllUsers`, `createUser`, and `verifyToken`. That is acceptable for a guide, but a production article could mention where these functions should be implemented.
- The CORS examples are technically valid, but production APIs should avoid wildcard origins when credentials or sensitive data are involved.
