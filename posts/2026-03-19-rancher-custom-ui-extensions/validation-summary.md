# Validation Summary: How to Build Custom Rancher UI Extensions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher UI Extensions
- Rancher Manager
- Kubernetes
- Helm
- Node.js
- Yarn
- Vue
- TypeScript

## Sources Consulted
- Rancher UI Extensions Getting Started (v2): https://extensions.rancher.io/extensions/v2/extensions-getting-started
- Rancher UI Extensions Cluster-Level Product example (v2): https://extensions.rancher.io/extensions/v2/usecases/cluster-level-product
- Rancher UI Extensions Routing docs (v2): https://extensions.rancher.io/extensions/v2/api/nav/routing
- Rancher UI Extensions Publishing docs (v2): https://extensions.rancher.io/extensions/v2/publishing
- Rancher Manager Extensions docs: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/rancher-extensions
- Rancher UI plugin examples repository: https://github.com/rancher/ui-plugin-examples
- Rancher Dashboard release-2.9 `service.vue` list implementation: https://raw.githubusercontent.com/rancher/dashboard/release-2.9/shell/list/service.vue

## Issues Found
- The scaffold section incorrectly described `@rancher/shell` as the creator package and used a single unversioned scaffold command. I corrected it to the official version-tagged `npm init @rancher/extension@legacy-v1|legacy-v2` flow for Rancher v2.7-v2.9.
- The development server example omitted the required `API=<Rancher URL>` environment variable. I updated the command to match the official docs.
- The `index.ts` example used an object-style plugin definition with `routes`, `stores`, and lifecycle handlers. Rancher extensions use a default exported function that calls `importTypes`, sets `plugin.metadata`, and registers products/routes. I replaced the entrypoint example with the supported pattern.
- The product and routing examples mixed top-level and cluster-level conventions. I made them consistent as a cluster-level product by switching `inStore` to `cluster`, keeping the `c-cluster-...` route naming, and moving route registration into `routing/extension-routing.js`.
- The overview page example read cluster fields that are not reliable across models. I changed the display fields to safer `nameDisplay` and `stateDisplay` fallbacks.
- The custom list view example did not follow the standard Rancher list-component pattern. I updated it to use `ResourceFetch`, the injected `schema` prop, `$initializeFetchData`, and `$fetchType`, which aligns with Rancher Dashboard’s release-2.9 list implementations.
- The custom action example used an unsupported `configureType(... customActions ...)` pattern. I replaced it with the supported `plugin.addAction(ActionLocation.TABLE, ...)` API.
- The build and release flow was inaccurate. `yarn build-helm`, `helm push`, direct `helm install`, and “Install from Helm Repository” do not match the documented Rancher extension publishing workflow. I updated the post to use `yarn publish-pkgs`, publish the generated assets to a public repository, then add that repository in Rancher and install the extension from the `Extensions` page.
- The testing section implied that `yarn test` and `yarn test:e2e` are scaffolded by default. I corrected this to explain that the generated project does not include those scripts unless the author adds a test runner.

## Review Notes
- The post is now technically accurate for the Rancher v2 Extensions API used with Rancher v2.7, v2.8, and v2.9.
- Rancher v2.10 and later use the newer v3 extension docs and package versions, so this post should not be treated as a v2.10+ guide without further updates.
