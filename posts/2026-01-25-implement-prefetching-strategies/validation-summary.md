# Validation Summary: How to Implement Prefetching Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HTML resource hints (`dns-prefetch`, `preconnect`, `preload`, `prefetch`, `modulepreload`)
- Browser Fetch API and Fetch Priority
- Network Information API
- Intersection Observer API
- React
- TanStack Query / React Query
- SWR
- Express.js
- node-cache

## Sources Consulted
- MDN Web Docs: `rel="prefetch"` - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/prefetch
- MDN Web Docs: `rel="preload"` - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/preload
- MDN Web Docs: `rel="dns-prefetch"` - https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/rel/dns-prefetch
- MDN Web Docs: `RequestInit.priority` - https://developer.mozilla.org/en-US/docs/Web/API/RequestInit
- MDN Web Docs: `NetworkInformation.saveData` - https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/saveData
- MDN Web Docs: `NetworkInformation.effectiveType` - https://developer.mozilla.org/en-US/docs/Web/API/NetworkInformation/effectiveType
- MDN Web Docs: Intersection Observer API - https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
- TanStack Query docs: QueryClient `prefetchQuery` - https://tanstack.com/query/latest/docs/reference/QueryClient
- SWR docs: Prefetching Data - https://swr.vercel.app/docs/prefetching
- Express docs: Using middleware - https://expressjs.com/en/guide/using-middleware/
- node-cache documentation - https://github.com/FormidableLabs/nodecache

## Issues Found
- The CSS preload example only preloaded the stylesheet and did not show applying it. Added a stylesheet link after the preload so the resource is actually used by the page.
- The font preload comment said it prevents FOUT. Preloading can reduce font loading delay, but it does not by itself guarantee prevention of FOUT/FOIT. Updated the comment to be technically accurate.
- The viewport prefetcher claimed to observe internal links, but its selector could include protocol-relative external URLs. Added an origin check before prefetching.
- The React Query example used `useState` without importing it. Added `useState` to the React import.
- The Express/node-cache middleware treated falsy cached values as cache misses. Updated the check to `cached !== undefined`, matching node-cache's miss behavior.

## Review Notes
- The Network Information API properties used in the examples are guarded with `navigator.connection`, which is appropriate because support is limited in some widely used browsers.
- `fetch(..., { priority: 'low' })` is a valid Fetch Priority hint, but it remains a browser scheduling hint rather than a hard guarantee.
- The article's browser support table is broadly acceptable for a high-level guide, but exact compatibility still varies by feature and browser version.
