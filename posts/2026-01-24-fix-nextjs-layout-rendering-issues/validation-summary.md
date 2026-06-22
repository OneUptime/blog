# Validation Summary: How to Fix 'Layout' Rendering Issues in Next.js

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Next.js App Router
- React Server Components
- React Client Components
- React Suspense
- Next.js layouts, templates, loading UI, and error boundaries
- Next.js Metadata and Viewport APIs
- CSS Modules, global CSS, and Tailwind CSS configuration

## Sources Consulted
- Next.js layout file convention: https://nextjs.org/docs/app/api-reference/file-conventions/layout
- Next.js template file convention: https://nextjs.org/docs/app/api-reference/file-conventions/template
- Next.js error file convention: https://nextjs.org/docs/app/api-reference/file-conventions/error
- Next.js loading file convention: https://nextjs.org/docs/app/api-reference/file-conventions/loading
- Next.js streaming guide: https://nextjs.org/docs/app/guides/streaming
- Next.js Server and Client Components guide: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js usePathname API: https://nextjs.org/docs/app/api-reference/functions/use-pathname
- Next.js useSearchParams API: https://nextjs.org/docs/app/api-reference/functions/use-search-params
- Next.js CSS Modules and global CSS guidance: https://nextjs.org/docs/14/app/building-your-application/styling/css-modules
- Next.js Metadata API: https://nextjs.org/docs/app/api-reference/functions/generate-metadata
- Next.js Viewport API: https://nextjs.org/docs/app/api-reference/functions/generate-viewport

## Issues Found
- The post labeled a parallel-route example as "Using Server Actions" and claimed the parallel slot would re-render on navigation. This was changed to a `template.tsx` example, because templates create a new instance during child route navigation and match the stated goal more directly.
- The layout data-fetching comment said the fetch runs only once. This was softened to say it does not run again for every child route navigation, which better matches App Router segment caching and layout persistence behavior.
- The hydration mismatch example showed `new Date()` directly in a Server Component root layout. A Server Component does not rerender on the client in the same way as a Client Component, so the example was changed to a Client Component header where date rendering can actually cause a server/client mismatch.
- The layout state example implied a client layout normally resets state while navigating between child product pages. This was corrected to say the state should persist within the segment and that resets usually indicate remounting through templates, leaving the segment, or key changes.
- The URL-backed filter example used `useSearchParams` directly in a layout-level Client Component. This was split into a nested Client Component wrapped in `Suspense`, matching Next.js guidance for `useSearchParams` in statically rendered routes.
- The error-boundary solution returned `<html>` and `<body>` from `app/error.tsx`, which is only appropriate for `app/global-error.tsx`. The example now uses a normal parent `app/error.tsx` for child layout errors and a separate `app/global-error.tsx` for root layout errors.
- The CSS section treated `import "./globals.css"` in `app/layout.tsx` as potentially incorrect. This is a valid root-layout global CSS import, so the wording and comments were corrected.

## Review Notes
The remaining examples are illustrative and reference application-specific helpers such as `getCurrentUser`, `FilterPanel`, and `Header`; those are acceptable placeholders for a guide. The `viewport` export and `themeColor` usage are current, and correctly avoid the deprecated `metadata.themeColor` field.
