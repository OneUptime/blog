# Validation Summary: How to Monitor SWR and React Query Data Fetching with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript browser tracing
- OpenTelemetry Fetch instrumentation
- SWR
- TanStack Query / React Query v5
- React
- TypeScript

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources API documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_resources.html
- TanStack Query v5 useQuery API reference: https://tanstack.com/query/v5/docs/framework/react/reference/useQuery
- TanStack Query v5 useMutation API reference: https://tanstack.com/query/v5/docs/framework/react/reference/useMutation
- TanStack Query v5 caching guide: https://tanstack.com/query/v5/docs/framework/react/guides/caching
- SWR API documentation: https://swr.vercel.app/docs/api
- Published package type definitions for @opentelemetry/sdk-trace-web 2.7.1, @opentelemetry/resources 2.7.1, @opentelemetry/semantic-conventions 1.41.1, @tanstack/react-query 5.101.0, @tanstack/query-core 5.101.0, and swr 2.4.1.

## Issues Found
- The OpenTelemetry setup used the deprecated `SemanticResourceAttributes` constants and `new Resource(...)` pattern. Updated the snippet to use `resourceFromAttributes`, `defaultResource`, `ATTR_SERVICE_NAME`, and `ATTR_SERVICE_VERSION`.
- The OpenTelemetry setup called `provider.addSpanProcessor(...)`, which is not part of the current OpenTelemetry JS 2.x `WebTracerProvider` API. Moved the `BatchSpanProcessor` into the provider's `spanProcessors` configuration.
- The installation commands omitted packages that the setup snippet imports directly. Added `@opentelemetry/resources` and `@opentelemetry/semantic-conventions`.
- The SWR and React Query hook snippets used `React.useEffect` without importing `React`. Added the missing imports.
- The React Query wrapper destructured `onSuccess`, `onError`, and `onSettled` from `UseQueryOptions`, but those query callbacks are not part of the current TanStack Query v5 `useQuery` options. Removed that destructuring.
- The TanStack Query cache configuration used the old `cacheTime` option. Updated it to `gcTime`, which is the current v5 option.
- The mutation wrapper used outdated mutation callback parameter ordering and dropped `onSettled`. Updated `onSuccess`, `onError`, and `onSettled` to match TanStack Query v5 callback signatures.
- The mutation wrapper options type allowed a second `mutationFn` in options, which could bypass the traced wrapper. Changed the options type to omit `mutationFn`.
- The usage example disabled the update button with `updateUser.isLoading`, but TanStack Query v5 mutation results expose `isPending`. Updated the example to use `isPending`.
- The usage example dereferenced `userQuery.data` after loading/error checks without ensuring data was defined. Added a minimal data guard.

## Review Notes
Browser OpenTelemetry instrumentation remains marked experimental in the official OpenTelemetry JavaScript documentation. The corrected examples are aligned with the current documented APIs, but readers should still pin package versions or re-check APIs when upgrading OpenTelemetry or TanStack Query.
