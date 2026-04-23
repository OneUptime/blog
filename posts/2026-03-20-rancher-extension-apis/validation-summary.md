# Validation Summary: How to Use Rancher Extension APIs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher UI Extensions
- Rancher Dashboard
- Kubernetes
- Vue 3
- Vuex
- JavaScript

## Sources Consulted
- Rancher UI Extensions Getting Started: https://extensions.rancher.io/extensions/next/extensions-getting-started
- Rancher UI Extensions Routing API: https://extensions.rancher.io/extensions/next/api/nav/routing
- Rancher UI Extensions Actions API: https://extensions.rancher.io/extensions/next/api/actions
- Rancher UI Extensions Tabs API: https://extensions.rancher.io/extensions/next/api/tabs
- Rancher UI Extensions Panels API: https://extensions.rancher.io/extensions/next/api/panels
- Rancher UI Extensions Hooks: https://extensions.rancher.io/extensions/next/advanced/hooks
- Rancher UI Extensions LocationConfig reference: https://extensions.rancher.io/extensions/next/api/common
- Rancher dashboard source, core extension types: https://github.com/rancher/dashboard/blob/master/shell/core/types.ts
- Rancher dashboard source, plugin implementation: https://github.com/rancher/dashboard/blob/master/shell/core/plugin.ts
- Rancher dashboard source, dashboard-store URL handling: https://github.com/rancher/dashboard/blob/master/shell/plugins/dashboard-store/getters.js
- Rancher dashboard source, cluster store configuration: https://github.com/rancher/dashboard/blob/master/shell/store/index.js
- Rancher dashboard source, Vuex `useStore` usage in Vue 3 components: https://github.com/rancher/dashboard/blob/master/shell/detail/configmap.vue

## Issues Found
- The prerequisites were outdated. The post used `yarn create @rancher/shell my-ext` and Node.js 16+, but current Rancher extension bootstrapping uses `npm init @rancher/extension@latest ...`, and the current latest guide requires Node.js 20. I updated both.
- The extension entry-point example used a context object with `$plugin` and a nonexistent `addNavItem` API. Current Rancher extensions receive the plugin instance directly and register products/routes with `addProduct(...)` and `addRoutes(...)`. I replaced the unsupported example with the documented initialization pattern.
- The tab example used the wrong `addTab` signature. Rancher’s tab API takes `(where, when, options)`, not a single object. I updated the example to use `TabLocation.RESOURCE_DETAIL_PAGE` and a proper `LocationConfig`.
- The action example used the wrong `addAction` signature, an incorrect resource identifier (`v1.pod`), and a `handler(...)` callback that does not match the documented API. I changed it to the supported `ActionLocation.TABLE` form with `invoke(...)` and `resource: ['pod']`.
- The store example imported `useStore` from `@shell/composables/store`, but current Rancher Vue 3 code uses Vuex’s `useStore` from `vuex`. I corrected the import and fixed the description so `cluster/findAll` is described as querying the current cluster, not the management cluster.
- The raw request section had incorrect request examples. The `management/request` example targeted `/v3/clusters`, and the `cluster/request` example passed a `clusterId` parameter that is not part of the request action interface. I replaced this with a raw Kubernetes API request that builds the fully qualified cluster URL from `store.getters['clusterId']`.
- The “Dashboard Panels” section incorrectly implied `addPanel` registers a home dashboard widget and used unsupported `name`, `label`, and `weight` fields. I replaced it with a supported `PanelLocation.RESOURCE_LIST` example, which matches the official API.
- The event section used `$plugin.on('cluster-changed', ...)`, which is not a documented extension API in current Rancher docs. I replaced it with the supported `addNavHooks(...)` lifecycle/navigation hook example.

## Review Notes
- The updated tab example uses `TabLocation.RESOURCE_DETAIL_PAGE`, which is the newer tab API for recent Rancher releases. Older Rancher versions may still rely on the legacy `TabLocation.RESOURCE_DETAIL` location, which is deprecated in newer releases.
- The post is technically valid after the corrections above.
