# Validation Summary: How to Configure Environment Variables in Next.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js
- Environment variables
- React Server Components
- App Router route handlers
- Pages Router API routes
- TypeScript
- Zod
- Docker
- Docker Compose
- GitHub Actions

## Sources Consulted
- Next.js official documentation: Environment Variables - https://nextjs.org/docs/pages/guides/environment-variables
- Next.js official documentation: Runtime Config - https://nextjs.org/docs/15/pages/api-reference/config/next-config-js/runtime-configuration
- Next.js official documentation: Output File Tracing and standalone output - https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Next.js official documentation: next.config.js env option - https://nextjs.org/docs/pages/api-reference/config/next-config-js/env
- Zod official documentation: Defining schemas - https://zod.dev/api

## Issues Found
- The environment file priority table was incomplete and described precedence backwards. Updated it to match Next.js lookup order: `process.env`, `.env.$(NODE_ENV).local`, `.env.local`, `.env.$(NODE_ENV)`, then `.env`.
- The type-safe environment example exported server and client validation from one module. Importing that module from a Client Component would also evaluate server-only validation in the client bundle. Split the example into `lib/env/server.ts` and `lib/env/client.ts`.
- The client-side examples said non-`NEXT_PUBLIC_` variables would be `undefined`. Updated the wording to say they are not available in client code, matching the current Next.js behavior and avoiding over-specific runtime claims.
- The runtime configuration section recommended `serverRuntimeConfig` and `publicRuntimeConfig`. Those options are deprecated and do not work with React Server Components or output file tracing. Replaced the example with request-time server-side environment access through an App Router route handler and added a deprecation note.
- The Dockerfile copied `.next`, `public`, and `package.json` but did not install or copy runtime dependencies, so `npm start` would not run reliably. Updated it to use Next.js standalone output and run `node server.js`.

## Review Notes
- The examples are now technically accurate for current Next.js documentation as of June 19, 2026.
- Public `NEXT_PUBLIC_` variables are still build-time inlined for browser bundles; runtime client configuration should be served from server-side code such as an API route when values must vary by deployment.
