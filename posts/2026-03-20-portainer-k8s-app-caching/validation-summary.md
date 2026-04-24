# Validation Summary: How to Enable Application Data Caching for Kubernetes in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Portainer HTTP API
- Kubernetes
- `curl`
- `jq`

## Sources Consulted
- Portainer account settings documentation: https://docs.portainer.io/user/account-settings
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer environment API documentation: https://docs.portainer.io/admin/environments/add/api
- Portainer 2.21 release notes / what's new page noting the per-user Kubernetes front-end cache: https://docs.portainer.io/2.21/whats-new
- Portainer source: user model (`UseCache` is a user field): https://github.com/portainer/portainer/blob/develop/api/portainer.go
- Portainer source: account settings UI for this feature: https://github.com/portainer/portainer/blob/develop/app/react/portainer/account/AccountView/ApplicationSettings/ApplicationSettingsForm.tsx
- Portainer source: user update API handler (`PUT /users/{id}` accepts `UseCache`): https://github.com/portainer/portainer/blob/develop/api/http/handler/users/user_update.go
- Portainer source: cache duration and invalidation logic: https://github.com/portainer/portainer/blob/develop/app/portainer/services/http-request.helper.ts
- Portainer source: page refresh clears the Kubernetes front-end cache: https://github.com/portainer/portainer/blob/develop/app/react/components/PageHeader/PageHeader.tsx
- Portainer source: Kubernetes responses are marked with `X-Portainer-Cache`: https://github.com/portainer/portainer/blob/develop/api/http/handler/kubernetes/handler.go
- Portainer source: Kubernetes endpoint type values used by the API: https://github.com/portainer/portainer/blob/develop/app/portainer/models/endpoint/models.js

## Issues Found
- The post described the feature as an environment-level server-side cache under **Environments → Edit → Kubernetes Settings**. Portainer documents and implements it as a per-user **front-end data caching** setting under **My account → Application settings**. Updated the UI instructions accordingly.
- The post claimed there was a configurable cache refresh interval with a default of 60 seconds. Portainer's source defines a fixed cache duration of five minutes and does not expose a per-environment refresh interval. Replaced the interval section with the correct fixed-duration behavior.
- The API example updated `/api/endpoints/{id}` and implied a `Kubernetes.Configuration.UseCache` field. In Portainer, `UseCache` belongs to the user object and is updated through `PUT /api/users/{id}`. Rewrote the API section to use `/api/users/me` and `PUT /api/users/{id}` with `UseCache`.
- The verification section suggested timing `curl` requests before and after enabling the cache. This does not verify the feature because the cache is in the front-end/browser session, not in `curl`. Replaced it with a header check for `X-Portainer-Cache` and browser-based verification guidance.
- The post claimed a manual API refresh endpoint at `/api/endpoints/{id}/kubernetes/cache/refresh`. I found no documented or implemented endpoint for this feature. Replaced this with the actual invalidation behavior from the Portainer source.
- The monitoring section advised inspecting Portainer container logs and memory usage as if the cache lived server-side in the Portainer container. That is incorrect for this feature, so I replaced it with browser developer-tools guidance.
- The post claimed each Kubernetes environment had its own separately configured cache and used `Type == 3` to identify Kubernetes endpoints. In Portainer, the setting is per user, and Kubernetes endpoint types are `5`, `6`, and `7`. Updated the explanation and corrected the API filter example.
- The resource list in **What Gets Cached** was too specific and unsupported by the official documentation. Replaced it with a narrower, source-backed description that Portainer marks eligible Kubernetes proxy responses with `X-Portainer-Cache` for front-end caching.
- The conclusion recommended unsupported thresholds such as `50 namespaces`, `200+ resources`, `60-second default`, and `300+ second` intervals. Removed those unsupported sizing and interval recommendations.

## Review Notes
- Portainer's current documentation uses HTTPS examples and `9443` as the default UI/API port, with `9000` only for legacy HTTP-enabled setups. The corrected examples reflect that.
- The feature is specifically about Kubernetes UI caching for the logged-in user's session. It should not be described as a general Portainer server-side cache.
