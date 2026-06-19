# Validation Summary: How to Fix 'Router.push' Not Working in Next.js

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Next.js App Router
- Next.js Pages Router
- Next.js Proxy / Middleware
- React hooks and Client Components
- TypeScript / TSX
- URLSearchParams

## Sources Consulted
- Next.js App Router `useRouter` API: https://nextjs.org/docs/app/api-reference/functions/use-router
- Next.js Pages Router `useRouter` API: https://nextjs.org/docs/pages/api-reference/functions/use-router
- Next.js Proxy file convention and matcher behavior: https://nextjs.org/docs/app/api-reference/file-conventions/proxy
- Next.js Middleware to Proxy migration note: https://nextjs.org/docs/messages/middleware-to-proxy
- Next.js `redirect` API: https://nextjs.org/docs/app/api-reference/functions/redirect
- Next.js Pages Router shallow routing docs: https://nextjs.org/docs/pages/building-your-application/routing/linking-and-navigating#shallow-routing
- Next.js `Link` component API: https://nextjs.org/docs/pages/api-reference/components/link
- React `useEffect` API: https://react.dev/reference/react/useEffect
- React purity rule for side effects outside render: https://react.dev/reference/rules/components-and-hooks-must-be-pure

## Issues Found
- The Pages Router diagram said `useRouter` works in any component. Updated it to say it works in function components, matching the official `useRouter` hook limitation.
- The `useEffect` example said a missing dependency array may not trigger. Updated the comment to state that the effect runs after every render and may repeat redirects.
- The Middleware section used the now-deprecated `middleware.ts` convention. Updated the wording and examples to use current Next.js Proxy terminology, `proxy.ts`, and `export function proxy`, while still mentioning Middleware for older Next.js versions.
- The dynamic route example interpolated `userId` directly into the path. Updated it to use `encodeURIComponent(userId)` so arbitrary IDs cannot accidentally create invalid or unintended path segments.
- The `router.refresh()` example called `router.push()` and `router.refresh()` back-to-back, which does not accurately describe `refresh()` as refreshing the current route. Updated the example to refresh server-rendered data on the current route after a mutation.
- The async handler comments implied a generic lost context problem. Adjusted the wording to the narrower issue of async work finishing after the component has unmounted.
- The checklist and summary still referred only to Middleware. Updated them to mention Proxy or Middleware.

## Review Notes
The post is technically relevant and the examples are broadly aligned with current Next.js routing guidance after the fixes. Future improvements could mention that `<Link>` is preferred for ordinary navigation and that `router.push`/`router.replace` must not receive untrusted unsanitized URLs.
