# Validation Summary: How to Debug Rancher UI Extensions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher UI Extensions
- Rancher Manager
- Kubernetes
- Vue, Vuex, and Vue Router
- Browser DevTools
- Jest unit testing

## Sources Consulted
- Rancher UI Extensions Quickstart: https://extensions.rancher.io/internal/getting-started/quickstart
- Rancher UI Extensions Getting Started (current / v3): https://extensions.rancher.io/extensions/next/extensions-getting-started
- Rancher UI Extensions Getting Started (legacy / v2): https://extensions.rancher.io/extensions/v2/extensions-getting-started
- Rancher UI Extensions Development Environment: https://extensions.rancher.io/internal/getting-started/development_environment
- Rancher UI Extensions API and stores: https://extensions.rancher.io/internal/code-base-works/api-resources-and-schemas
- Rancher UI Extensions Routing API: https://extensions.rancher.io/extensions/v2/api/nav/routing
- Rancher Extensions in Rancher Manager: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/rancher-extensions
- Rancher Feature Flags: https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-references/feature-flags
- Official Rancher example extensions repository: https://github.com/rancher/ui-plugin-examples

## Issues Found
- The prerequisites were outdated. The post said extensions are scaffolded with `@rancher/shell` and required `Node.js 16+`, but current Rancher docs use `@rancher/extension` and split Node requirements by extension generation/version. I updated the prerequisite text to reflect current and legacy workflows.
- The local development URL was incorrect. Rancher’s extension docs use `https://localhost:8005` / `https://127.0.0.1:8005`, not `http://localhost:8005`. I corrected the URL and nearby explanation.
- The Vue DevTools/store debugging example relied on `window.__vue_app__`, which is not a Rancher-documented global debugging API. I changed the guidance to expose `store` and `route` from a component and inspect those handles from the browser console.
- The Step 3 store explanation overstated Rancher as a single Vuex store. Rancher documents multiple stores such as `management`, `cluster`, and `rancher`. I updated the explanation and console example accordingly.
- The route registration snippet used `export default function({ $plugin })` and an inline route example that did not match Rancher’s documented extension registration pattern. I changed it to the documented `plugin`-based pattern with `addProduct` and `addRoutes`.
- The extension troubleshooting commands were incorrect. UI extensions are managed through the `cattle-ui-plugin-system` namespace and the `ui-plugin-operator`, not a `helmchart` lookup in `cattle-system` plus logs from an `app=my-extension` pod. I replaced the commands with extension-system pod and operator log checks.
- The `NavigationDuplicated` example was too version-specific for current Rancher guidance after the Vue 3 transition. I rewrote it as a generic duplicate-navigation / `router.push()` failure case.
- The testing section assumed a Vitest setup and `yarn test:unit`, which does not match Rancher’s documented Jest-oriented test guidance and is not exposed by the official example repo by default. I changed the example to a Jest-style test and made the command conditional on the repo’s configured test script.

## Review Notes
- Rancher v2.10 introduced the Vue 3-based extension documentation track. Older `v2` / Rancher v2.9 extensions still use legacy docs and different Node requirements, so version-matched documentation matters for any future updates to this post.
