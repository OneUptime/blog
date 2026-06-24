# Validation Summary: How to Structure Large-Scale React Applications for Maintainability

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- React
- TypeScript
- TanStack Query / React Query
- Zustand
- React Hook Form
- Zod
- Axios
- React Router
- ESLint
- Mock Service Worker
- TanStack Virtual
- Testing Library
- Vitest

## Sources Consulted
- React Component API and error boundaries: https://react.dev/reference/react/Component
- React Router `createBrowserRouter`: https://reactrouter.com/api/data-routers/createBrowserRouter
- React Router error boundaries: https://reactrouter.com/how-to/error-boundary
- TanStack Query `useQuery` reference: https://tanstack.com/query/v5/docs/framework/react/reference/useQuery
- TanStack Query v5 migration guide: https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5
- TanStack Query invalidation guide: https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation
- TanStack Query `QueryClient` reference: https://tanstack.com/query/latest/docs/reference/QueryClient
- Zustand `devtools` middleware: https://zustand.docs.pmnd.rs/reference/middlewares/devtools
- React Hook Form `useForm`: https://react-hook-form.com/docs/useform
- React Hook Form resolvers: https://github.com/react-hook-form/resolvers
- Zod API reference: https://zod.dev/api
- Axios instance documentation: https://axios-http.com/docs/instance
- Axios response schema: https://axios-http.com/docs/res_schema
- ESLint `no-restricted-imports`: https://eslint.org/docs/latest/rules/no-restricted-imports
- Mock Service Worker 1.x to 2.x migration guide: https://mswjs.io/docs/migrations/1.x-to-2.x/
- TanStack Virtual React docs: https://tanstack.com/virtual/latest/docs/framework/react/react-virtual

## Issues Found
- The `IncidentList` component destructured `incidents` directly from the TanStack Query result, but `useQuery` returns fetched data on the `data` property. Changed it to `data: incidents = []` so the example works and avoids spreading `undefined`.
- The `useUpdateIncident` mutation accepted `Partial<Incident>` instead of the narrower `UpdateIncidentPayload`. Updated the mutation type and imported `UpdateIncidentPayload` to keep the service contract accurate.
- The form example submitted create data without the required `projectId` field from `CreateIncidentPayload`. Added `projectId` to the Zod schema and form defaults, and stripped it from update payloads before calling the update mutation.
- The Axios client used `BASE_URL = '/api'` while service endpoints also started with `/api/v1`, which would produce duplicated API prefixes when combined. Changed the default base URL to an empty string so the shown endpoints resolve as written.
- The router example used a React class error boundary as `errorElement`, which does not make it wrap route children and is not how React Router data-router errors are accessed. Moved the React error boundary around the protected layout outlet so it catches render errors in its child tree.
- The test utility configured a custom TanStack Query logger, which was removed in TanStack Query v5. Removed the obsolete `logger` option from the `QueryClient` configuration.
- The MSW test example used the removed v1 `rest`, `req`, `res`, and `ctx` APIs. Updated it to MSW v2 `http` handlers and `HttpResponse`.
- The component test used `vi.fn()` without importing `vi`. Added the missing Vitest import.

## Review Notes
The architectural recommendations are broadly sound for large React applications, but several are intentionally opinionated rather than universal rules. The guide now aligns its code examples with current TanStack Query v5 and MSW v2 APIs.
