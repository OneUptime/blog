# Validation Summary: How to Handle Authentication in Next.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js App Router
- Next.js Route Handlers
- Next.js Proxy
- Next.js cookies and NextResponse APIs
- NextAuth.js
- JWT authentication
- jose
- bcryptjs
- HTTP-only cookies, SameSite cookies, and CSRF mitigation
- Role-based access control
- Refresh token pattern

## Sources Consulted
- Next.js cookies API: https://nextjs.org/docs/app/api-reference/functions/cookies
- Next.js Route Handlers: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js Proxy file convention: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js NextResponse API: https://nextjs.org/docs/app/api-reference/functions/next-response
- NextAuth.js Next.js configuration: https://next-auth.js.org/configuration/nextjs
- NextAuth.js client API / SessionProvider: https://next-auth.js.org/getting-started/client
- NextAuth.js TypeScript module augmentation: https://next-auth.js.org/getting-started/typescript
- NextAuth.js callbacks: https://next-auth.js.org/configuration/callbacks
- jose SignJWT documentation: https://github.com/panva/jose/blob/main/docs/jwt/sign/classes/SignJWT.md
- jose jwtVerify documentation: https://github.com/panva/jose/blob/main/docs/jwt/verify/functions/jwtVerify.md
- bcryptjs package documentation: https://www.npmjs.com/package/bcryptjs
- OWASP Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

## Issues Found
- The introduction said the guide covered both the App Router and Pages Router, but the examples are App Router examples. Updated the wording to say the guide covers the App Router.
- The JWT examples used fallback secrets or TypeScript-only non-null assertions. Replaced those with runtime checks so missing secrets fail explicitly instead of silently using an insecure default or empty value.
- The auth examples used `middleware.ts` and `middleware()`. Current Next.js documentation marks Middleware as deprecated and renamed to Proxy. Updated the affected headings, diagrams, file names, and exported functions to `proxy.ts` and `proxy()`.
- The NextAuth server component imported `authOptions` from an App Router route handler, and the route handler snippet did not export it. Moved the shared NextAuth configuration to `lib/nextauth.ts` and imported it from both the route handler and server component.
- The standalone NextAuth credentials example referenced `findUserByEmail` without defining it. Added a typed placeholder database lookup so the snippet is syntactically complete.
- The NextAuth TypeScript module augmentation replaced default session user fields. Updated it to extend `DefaultSession['user']`, following the official module augmentation pattern.
- The server-side NextAuth example imported `getServerSession` from `next-auth`. Updated it to `next-auth/next`, matching the documented import path for the shown v4-style API.
- The login form passed the `returnTo` query parameter directly into `router.push`. Added validation so only same-origin path redirects are accepted, avoiding unsafe redirects or untrusted URLs.
- The RBAC HOC passed a possibly undefined role to `Array.includes` and omitted dependencies from the effect. Added a local role check and complete dependency list.
- The refresh token utility referenced `UserPayload` without importing it. Added the missing type import.
- The refresh route referenced `getUserById` without defining it. Added a typed placeholder database lookup so the snippet is syntactically complete.
- The refresh route set cookies without `path: '/'`, which would make browser default path behavior too narrow for app-wide auth cookies. Added `path: '/'` to both token cookies.
- The security best-practices wording overstated HttpOnly and SameSite protections. Updated the wording to say HttpOnly reduces token theft risk through XSS and SameSite helps mitigate CSRF.

## Review Notes
The refresh token example is still a simplified tutorial pattern. A production implementation should store refresh token identifiers server-side, detect reuse, and invalidate old refresh tokens when rotating them.
