# Validation Summary: How to Handle Dynamic Routing in Next.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js App Router
- Next.js Pages Router
- React
- TypeScript
- Dynamic routes, catch-all routes, and optional catch-all routes
- Static generation with `generateStaticParams`, `getStaticPaths`, and `getStaticProps`
- Programmatic navigation with `useRouter`
- Route Groups, Parallel Routes, and Intercepting Routes

## Sources Consulted
- Next.js App Router Dynamic Route Segments: https://nextjs.org/docs/app/api-reference/file-conventions/dynamic-routes
- Next.js `page.js` props (`params` and `searchParams`): https://nextjs.org/docs/app/api-reference/file-conventions/page
- Next.js `generateStaticParams`: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- Next.js Pages Router Dynamic Routes: https://nextjs.org/docs/pages/building-your-application/routing/dynamic-routes
- Next.js Pages Router `getStaticPaths`: https://nextjs.org/docs/pages/api-reference/functions/get-static-paths
- Next.js Pages Router `getStaticProps`: https://nextjs.org/docs/pages/api-reference/functions/get-static-props
- Next.js App Router `useRouter`: https://nextjs.org/docs/app/api-reference/functions/use-router
- Next.js Pages Router `useRouter`: https://nextjs.org/docs/pages/api-reference/functions/use-router
- Next.js Route Groups: https://nextjs.org/docs/app/api-reference/file-conventions/route-groups
- Next.js Parallel Routes: https://nextjs.org/docs/app/api-reference/file-conventions/parallel-routes
- Next.js Intercepting Routes: https://nextjs.org/docs/app/api-reference/file-conventions/intercepting-routes

## Issues Found
- The App Router section was labeled broadly as Next.js 13+, but the code examples use the current async `params` and `searchParams` prop shape introduced in Next.js 15. Added a short caveat explaining that the examples use Next.js 15+ syntax and that Next.js 14 and earlier used synchronous props.
- The App Router navigation example placed a `button` inside a clickable `div`. Clicking the button would bubble to the parent and could trigger both the query-param navigation and the base product navigation. Updated the handler to accept the click event and call `event.stopPropagation()` before navigating with the query parameter.

## Review Notes
The examples use placeholder helper functions such as `getProduct`, `getDoc`, and `getCategories`; those are appropriate for a routing tutorial but would need concrete implementations in a runnable project. Several snippets intentionally omit complete prop typing for brevity.
