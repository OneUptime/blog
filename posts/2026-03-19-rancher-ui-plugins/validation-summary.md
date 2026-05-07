# Validation Summary: How to Develop Rancher UI Plugins

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Rancher UI Extensions
- Rancher Dashboard
- Kubernetes CRDs and API access
- Vue.js
- Vuex
- Helm-based extension distribution

## Sources Consulted
- Rancher UI Extensions Getting Started: https://extensions.rancher.io/extensions/next/extensions-getting-started
- Rancher UI Extensions Folder Structure: https://extensions.rancher.io/extensions/next/folder-structure
- Rancher UI Extensions Routing: https://extensions.rancher.io/extensions/next/api/nav/routing
- Rancher UI Extensions Side Menu: https://extensions.rancher.io/extensions/next/api/nav/side-menu
- Rancher UI Extensions Resource Page: https://extensions.rancher.io/extensions/next/api/nav/resource-page
- Rancher UI Extensions Publishing: https://extensions.rancher.io/extensions/next/publishing
- Rancher UI Extensions API internals: https://extensions.rancher.io/internal/code-base-works/api-resources-and-schemas
- Rancher UI Extensions Forms and Validation: https://extensions.rancher.io/internal/code-base-works/forms-and-validation
- Rancher UI Extensions Customizing Kubernetes Resource Presentation: https://extensions.rancher.io/internal/code-base-works/customising-how-kubernetes-resources-are-presented
- Rancher dashboard source: https://github.com/rancher/dashboard/blob/master/shell/plugins/dashboard-store/resource-class.js
- Rancher dashboard source: https://github.com/rancher/dashboard/blob/master/shell/plugins/steve/actions.js
- Rancher dashboard source: https://github.com/rancher/dashboard/blob/master/shell/components/CruResource.vue
- Rancher dashboard source: https://github.com/rancher/dashboard/blob/master/shell/mixins/create-edit-view/impl.js
- Rancher example extensions: https://github.com/rancher/ui-plugin-examples

## Issues Found
- The project scaffold command was outdated. It used `npx @rancher/create-extension`, but Rancher’s current docs for Rancher v2.10+ use `npm init @rancher/extension@latest <name>`. I updated the command accordingly.
- The project structure omitted important current extension files and folders, including the extension package `package.json`, `routing/extension-routing.ts`, and the `detail` / `edit` / `list` auto-import folders. I corrected the structure example.
- The top-level product example mixed `management` store registration with cluster-level route naming. I corrected it to use the documented top-level pattern with `BLANK_CLUSTER`, matching route names, and translated `virtualType` labels.
- The CRD registration example did not define a product landing route and omitted `customRoute` / `canYaml`, which Rancher documents for configured resource pages. I added those fields and aligned the route pattern with the cluster-level product example.
- The resource model example returned plain color names from `stateColor`, but Rancher’s resource model expects text color classes such as `text-success`. I corrected the return values.
- The custom resource action example dispatched `cluster/request` from a model. In Rancher models, the correct pattern is to use the local store action via `this.$dispatch('request', ...)`. I corrected the method and made it async.
- The resource model example included a `detailTabs` getter, but current Rancher extensions add detail tabs through the tab extension API rather than generic resource-model `detailTabs` overrides. I removed the unsupported example.
- The custom list column example used `BadgeState` as a formatter name. Rancher’s formatter component name is `BadgeStateFormatter`. I corrected the formatter and aligned the state/age column configuration more closely with Rancher’s table header conventions.
- The `index.ts` example in the i18n section used an outdated object-style export that did not match the current extension entry pattern and did not show the normal `addProduct` / `addRoutes` flow. I replaced it with the standard function-based extension entry.
- The build/publish section used a `build-helm` script and generic `helm package` / `helm push` flow that does not match Rancher’s documented extension publishing workflow. I updated it to the documented `publish-pkgs` flow for generating extension Helm assets.

## Review Notes
Examples in the post now align with Rancher’s current extension documentation for Rancher v2.10+ and the current UI Extensions docs. Older Rancher versions still require legacy extension tags such as `legacy-v1` or `legacy-v2`. Rancher’s current documentation primarily uses the term `extensions`, although the runtime APIs still expose plugin-oriented names such as `IPlugin`.
