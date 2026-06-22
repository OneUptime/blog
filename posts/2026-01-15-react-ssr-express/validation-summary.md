# Validation Summary: How to Implement Server-Side Rendering in React with Express

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- React server rendering
- React hydration
- React Router
- Express
- TypeScript
- Webpack
- Node.js
- SSR data fetching, serialization, caching, and error handling

## Sources Consulted
- React `renderToPipeableStream` documentation: https://react.dev/reference/react-dom/server/renderToPipeableStream
- React `renderToString` documentation: https://react.dev/reference/react-dom/server/renderToString
- React `hydrateRoot` documentation: https://react.dev/reference/react-dom/client/hydrateRoot
- React `createRoot` documentation: https://react.dev/reference/react-dom/client/createRoot
- React `Component` / error boundary documentation: https://react.dev/reference/react/Component
- React Router SSR guide: https://reactrouter.com/6.30.4/guides/ssr
- Express 5 migration guide: https://expressjs.com/en/guide/migrating-5/
- Webpack output documentation: https://webpack.js.org/configuration/output/
- Webpack manifest plugin documentation: https://webpack.js.org/plugins/manifest-plugin/
- TypeScript `moduleResolution` documentation: https://www.typescriptlang.org/tsconfig/moduleResolution.html

## Issues Found
- The dependency installation commands omitted `react-router-dom`, even though the examples import React Router APIs. Added it to core dependencies.
- The Webpack examples used `null-loader` and the server render code expected `manifest.json`, but neither `null-loader` nor a manifest plugin was installed/configured. Added the missing packages and configured `WebpackManifestPlugin`.
- The client Webpack config emitted hashed filenames in all environments while the development fallback referenced `/static/client.js` and `/static/vendors.js`. Changed hashed filenames to production only.
- The Express catch-all route used `app.get('*')`, which is not valid with Express 5 path matching. Replaced it with `app.get('/{*splat}', ...)` so it also matches `/`.
- The render function imported unused server APIs and narrowed `Object.values(manifest)` incorrectly under strict TypeScript. Removed unused imports and typed the manifest values before filtering.
- The `renderToString` section said Suspense boundaries are not supported. Updated this to reflect React's current limited Suspense behavior: fallback HTML is emitted immediately when a component suspends.
- The streaming SSR example manually wrote the opening document, piped React into the response, and never wrote closing tags. Reworked it to stream a whole-document React tree and write only the doctype before piping.
- The route data-fetching example typed async import functions as React components. Changed the examples to use `React.lazy()`.
- The Suspense data-fetching sample used an ad hoc data source without caveats and a relative server-side fetch. Added the official caveat and made the resource factory accept a base URL.
- The Suspense resource type was imported but not exported in the snippet, and the resource would be recreated on every render. Exported the type and memoized the resource.
- The error boundary section implied relevance to SSR failures. Added a caveat that React error boundaries do not catch server-side rendering errors.

## Review Notes
The post is technically relevant and useful as an educational guide, but a production SSR setup should still add full build scripts, an asset ordering strategy for split chunks, route-aware status codes and redirects, and framework- or router-supported data loading for Suspense-heavy applications.
