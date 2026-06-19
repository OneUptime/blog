# Validation Summary: How to Configure React Testing Library

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- React
- React Testing Library
- DOM Testing Library
- Jest
- Vitest
- jsdom
- @testing-library/jest-dom
- @testing-library/user-event
- Mock Service Worker
- TanStack Query
- React Router
- Redux Toolkit
- GitHub Actions
- Codecov

## Sources Consulted
- React Testing Library setup documentation: https://testing-library.com/docs/react-testing-library/setup/
- Testing Library configuration options: https://testing-library.com/docs/dom-testing-library/api-configuration/
- Testing Library jest-dom documentation: https://testing-library.com/docs/ecosystem-jest-dom/
- Testing Library user-event setup documentation: https://testing-library.com/docs/user-event/setup/
- Testing Library user-event options documentation: https://testing-library.com/docs/user-event/options/
- Mock Service Worker 1.x to 2.x migration guide: https://mswjs.io/docs/migrations/1.x-to-2.x/
- TanStack Query testing guide: https://tanstack.com/query/latest/docs/framework/react/guides/testing
- TanStack Query v5 migration guide: https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5
- Vitest configuration documentation: https://vitest.dev/config/
- Jest configuration documentation: https://jestjs.io/docs/configuration
- React Router MemoryRouter documentation: https://reactrouter.com/api/declarative-routers/MemoryRouter
- Create React App getting started documentation: https://create-react-app.dev/docs/getting-started/

## Issues Found
- The MSW examples used the pre-v2 `rest`, `req`, `res`, and `ctx` API. Updated them to the current `http` and `HttpResponse` API, changed request body access to `request.json()`, and changed route params access to `params`.
- The MSW handlers defined duplicate `GET /api/users/:userId` handlers, making the error case ambiguous. Consolidated the success and 404 behavior into one handler.
- The TanStack Query example used `cacheTime`, which was renamed to `gcTime` in v5. Updated the test QueryClient defaults to use `gcTime: Infinity`, matching the current testing guidance for Jest.
- The Vite configuration imported `defineConfig` from `vite` while using a `test` configuration block. Updated the import to `vitest/config`, which supports Vitest config typing directly.
- The React Router navigation example asserted `window.location.pathname` while the custom render defaulted to `MemoryRouter`, which stores history in memory instead of updating the browser location. Updated the custom render helper to initialize browser history for `routerType: 'browser'` and set the navigation test to use that router type.
- The user-event configuration comment said `delay: null` simulated realistic delays. Updated the option to the default `delay: 0` and corrected the comments for `delay` and `skipAutoClose`.
- The API mocking section used MSW but the dependency installation snippet did not include `msw`. Added a dev dependency install command for MSW.
- The async MSW retry example referenced `setupUser`, `server`, and `rest` without imports. Added the missing imports and updated the handler to MSW v2.
- The custom matcher usage example referenced `render`, `screen`, `user`, and `Form` without setup. Added the missing imports and `setupUser()` call.
- The Create React App note described CRA as a current default setup path. Updated the wording to identify it as legacy, consistent with the CRA documentation's deprecation notice.

## Review Notes
- Some snippets remain illustrative and depend on project-specific components, providers, reducers, themes, and form behavior that are not included in the post.
- The Jest configuration assumes related packages such as `jest`, `babel-jest`, `identity-obj-proxy`, and `jest-environment-jsdom` are already installed or provided by the project's tooling.
- Suppressing React `act()` warnings globally can hide real test problems. The snippet is technically possible, but future revisions should discourage broad suppression unless the warning source is well understood.
