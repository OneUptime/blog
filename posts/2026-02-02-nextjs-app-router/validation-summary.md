# Validation Summary: How to Use Next.js App Router

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Next.js App Router (v13+, with corrections for v15+ behavior)
- React (including React 19 hooks)
- React Server Components and Client Components
- Server Actions
- Route Handlers (API routes)
- Next.js Middleware
- File-based routing, dynamic routes, catch-all routes
- Parallel and Intercepting Routes
- Metadata API (static and `generateMetadata`)

## Sources Consulted
- Next.js Page file conventions: https://nextjs.org/docs/app/api-reference/file-conventions/page
- Next.js Route Handler conventions: https://nextjs.org/docs/app/api-reference/file-conventions/route
- Next.js `fetch` API reference: https://nextjs.org/docs/app/api-reference/functions/fetch
- React 19 `useActionState`: https://react.dev/reference/react/useActionState
- Next.js 15 upgrade notes for async `params` / `searchParams` and caching defaults

## Issues Found

Several code examples and comments reflected pre-Next.js 15 / pre-React 19 behavior. Given the post is dated February 2026, it should reflect Next.js 15+ (released October 2024) and React 19. Fixes applied:

1. **Async `params` in dynamic pages, route handlers, and `generateMetadata`** — In Next.js 15+, `params` (and `searchParams`) are Promises and must be awaited.
   - `app/blog/[slug]/page.js` (BlogPost dynamic route): made the component `async` and added `const { slug } = await params;`.
   - `app/docs/[...slug]/page.js` (DocsPage catch-all): same treatment.
   - `app/blog/[slug]/page.js` (BlogPost with `notFound()` example): added `const { slug } = await params;` before fetching.
   - `app/api/users/[id]/route.js` (GET, PUT, DELETE handlers): awaited `params` to extract `id`.
   - `generateMetadata({ params })` example: awaited `params`.
   - `app/@modal/(.)photo/[id]/page.js` (PhotoModal): made async and awaited `params`.

2. **Default `fetch` caching comment** — The post stated `cache: 'force-cache' // Default - cache indefinitely`. In Next.js 15+, the default is no longer cached; you must opt in. Updated the comment to clarify that `force-cache` is now an opt-in, and added a similar note to the caching-strategies example.

3. **`useFormState` → `useActionState`** — `useFormState` from `react-dom` was renamed and moved to `react` in React 19 as `useActionState`. Updated the ContactForm example to import `useActionState` from `react` (kept `useFormStatus` import from `react-dom`, which is still correct).

## Review Notes

- The Next.js 15 GET route handler caching change is mentioned in passing in the broader fetch-caching note. No specific code example in the post relied on the old "GET handlers cached by default" behavior, so no further changes were needed there.
- The Mermaid routing-hierarchy diagram uses the node label `app/blog/slug/page.js` rather than `app/blog/[slug]/page.js` because Mermaid would interpret square brackets as node syntax. Left as-is since it is a diagram rendering concession, not a technical inaccuracy.
- The middleware example uses `request.cookies.get('auth-token')` and relies on the returned cookie object being falsy when absent — this is correct for Next.js' `RequestCookies` API (`get()` returns `undefined` when the cookie is not present).
- The post's use of plain `<a>` tags in some examples instead of `next/link`'s `<Link>` is intentional for brevity in the early sections; `<Link>` is later introduced in the "Shared Components" section. Not a technical issue.
- For future updates: if React 19 / Next.js 15 sees further releases that affect `useFormStatus` semantics or introduce new APIs (e.g. richer `useActionState` permissions, View Transitions stable), the post may need another refresh.
