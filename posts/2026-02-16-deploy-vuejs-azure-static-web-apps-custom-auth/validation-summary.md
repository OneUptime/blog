# Validation Summary: How to Deploy a Vue.js Application to Azure Static Web Apps

## Status
validated

## Post Type
Tutorial / deployment guide

## Technologies Covered
- Vue.js
- Vite and create-vue
- Vue Router
- Azure Static Web Apps
- Azure Static Web Apps authentication and authorization
- Custom OpenID Connect providers
- Azure CLI
- Azure Functions for Node.js
- Auth0 / OpenID Connect

## Sources Consulted
- Vue.js Quick Start: https://vuejs.org/guide/quick-start.html
- Vue Router navigation guards: https://router.vuejs.org/guide/advanced/navigation-guards.html
- Azure Static Web Apps authentication and authorization: https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-authorization
- Azure Static Web Apps custom authentication: https://learn.microsoft.com/en-us/azure/static-web-apps/authentication-custom
- Azure Static Web Apps user information endpoint: https://learn.microsoft.com/en-us/azure/static-web-apps/user-information
- Azure Static Web Apps configuration: https://learn.microsoft.com/en-us/azure/static-web-apps/configuration
- Azure Static Web Apps hosting plans: https://learn.microsoft.com/en-us/azure/static-web-apps/plans
- Azure CLI `az staticwebapp` reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp
- Azure CLI `az staticwebapp appsettings` reference: https://learn.microsoft.com/en-us/cli/azure/staticwebapp/appsettings
- Azure Functions triggers and bindings for Node.js v4: https://learn.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings

## Issues Found
- Updated the Node.js prerequisite from "18 or later" to the current `create-vue` requirement, "20.19 or later, or 22.12 or later."
- Removed outdated built-in provider wording that listed Twitter and Azure AD. Microsoft documentation now lists GitHub and Microsoft Entra ID as preconfigured providers and notes that X/Twitter is no longer supported as a preconfigured provider.
- Added the Azure Static Web Apps Standard plan requirement for custom authentication and added `--sku Standard` to the deployment command.
- Changed the friendly `/login` route from `rewrite` to `redirect`, matching Azure Static Web Apps documentation for friendly authentication routes.
- Changed route patterns from `/admin/*`, `/dashboard/*`, and `/api/admin/*` to prefix wildcard forms (`/admin*`, `/dashboard*`, `/api/admin*`) so the rules also match the base route.
- Updated the Vue Router login redirect to send a fully qualified, URL-encoded `post_login_redirect_uri`.
- Replaced the custom roles API example with the documented `rolesSource` pattern. Static Web Apps calls this function after sign-in and expects a JSON body with a `roles` array; a normal public admin endpoint returning a success message would not assign roles.
- Clarified the wrap-up language so it does not imply Static Web Apps route rules secure all client-side SPA navigation. The server-side route rules protect matching HTTP requests and API endpoints, while Vue Router guards handle client-side navigation.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI syntax was validated against Microsoft Learn command reference pages rather than local `az --help` output.
