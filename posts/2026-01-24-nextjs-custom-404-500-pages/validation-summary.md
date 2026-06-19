# Validation Summary: How to Configure Custom 404/500 Pages in Next.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js App Router
- React Server Components and Client Components
- Next.js file-system conventions: `not-found.tsx`, `error.tsx`, `global-error.tsx`, and route handlers
- TypeScript
- HTTP status codes for API-style route handlers

## Sources Consulted
- Next.js documentation: not-found.js file convention, https://nextjs.org/docs/app/api-reference/file-conventions/not-found
- Next.js documentation: notFound function, https://nextjs.org/docs/app/api-reference/functions/not-found
- Next.js documentation: error.js file convention, https://nextjs.org/docs/app/api-reference/file-conventions/error
- Next.js documentation: page.js file convention and `params` prop, https://nextjs.org/docs/app/api-reference/file-conventions/page
- Next.js documentation: route.js file convention and route handler context params, https://nextjs.org/docs/app/api-reference/file-conventions/route

## Issues Found
- The dynamic page example typed `params` as a plain object and accessed `params.slug` synchronously. Current Next.js App Router docs define `params` as a promise, so the example now types `params` as `Promise<{ slug: string }>` and awaits it before reading `slug`.
- The route handler example typed `params` as a plain object and accessed `params.id` synchronously. Current route handler docs define context `params` as a promise, so the example now awaits `params` before calling `getUserById`.
- The route-specific 404 section implied that `app/blog/not-found.tsx`, `app/docs/not-found.tsx`, and similar files automatically handle arbitrary unmatched child URLs such as `/blog/invalid`. Current docs distinguish route-segment `not-found` behavior from root/global unmatched URL handling, so the explanation and diagram were updated to say nested `not-found.tsx` files render when `notFound()` is thrown in that segment or its children.
- The error boundary examples used the older `reset` prop for retry buttons. Current Next.js docs recommend `unstable_retry()` for refetching and rerendering the segment in most cases, so the examples now use `unstable_retry`.
- The metadata example exported `metadata` from `app/not-found.tsx`. Current Next.js docs document 404 metadata exports for the experimental `global-not-found.tsx` convention, which also requires the `experimental.globalNotFound` flag and a full HTML document, so the example was updated accordingly.

## Review Notes
The post remains accurate for App Router custom error UI. Next.js also documents experimental `global-not-found.js` for apps that need a routing-level global 404 page, especially with multiple root layouts or top-level dynamic root layouts; the existing root `app/not-found.tsx` guidance is still valid for ordinary apps.
