# Validation Summary: How to Handle IPv6 Client Addresses in GraphQL Middleware

## Status
validated

## Post Type
Guide

## Technologies Covered
- GraphQL
- Apollo Server
- Express
- Node.js HTTP networking
- IPv6
- JavaScript
- TypeScript

## Sources Consulted
- Apollo Server context and `contextValue` docs: https://www.apollographql.com/docs/deploy-preview/c68151860cbd51669d365905/apollo-server/data/context
- Apollo Server plugin event reference: https://www.apollographql.com/docs/deploy-preview/80dd7e655dfb8cfdb07db1ef/apollo-server/integrations/plugins-event-reference
- Apollo Server `startStandaloneServer` API reference: https://www.apollographql.com/docs/deploy-preview/a7b85a4d74451af6a853/apollo-server/api/standalone
- Apollo Server Express integration reference: https://www.apollographql.com/docs/deploy-preview/bb23fda03161251eceb46ea4/apollo-server/api/express-middleware
- Express behind proxies guide: https://expressjs.com/en/guide/behind-proxies.html
- Express 5 API reference for `trust proxy`, `req.ip`, and `req.ips`: https://expressjs.com/en/api.html
- Node.js `net.Socket.remoteAddress` docs: https://nodejs.org/api/net.html
- Node.js HTTP docs for deprecated `request.connection`: https://nodejs.org/api/http.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- OneUptime homepage link verification: https://oneuptime.com/

## Issues Found
- The original IP extraction helper trusted `X-Forwarded-For` and `X-Real-IP` unconditionally. I updated it to prefer Express `req.ip`, only read forwarded headers when explicitly allowed, and removed the deprecated `req.connection` fallback.
- The Apollo Server example used `startStandaloneServer` without importing it. I added the missing `@apollo/server/standalone` import.
- The Apollo plugin example read `operationName` from `contextValue`, which Apollo does not populate automatically. I changed the example to capture the resolved operation name in `didResolveOperation` and log it from `willSendResponse`.
- The TypeScript context example referenced an undefined `normalizeIPv6` helper and mixed incompatible request typings. I updated it to import `extractClientIP`, use `IncomingMessage`, and export a working `createContext` function.
- The Express logger and feature-flag examples could produce non-boolean values or label a missing client IP as IPv4. I normalized those checks to booleans and made the logger report `unknown` when no client IP is available.
- The test example no longer matched the safer proxy-handling logic after the fix. I updated the tests to cover both trusted proxy headers and Express-resolved `req.ip`.

## Review Notes
- `startStandaloneServer` receives Node `http.IncomingMessage` objects. If an application depends on broader Express request APIs, Apollo’s `expressMiddleware` integration is the better fit.
- Proxy-derived client IPs remain deployment-specific. The examples are now accurate, but production behavior still depends on correct `trust proxy` configuration in Express or equivalent proxy controls in front of a standalone server.
