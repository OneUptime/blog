# Validation Summary: How to Create a Custom Dashboard in Rancher

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rancher UI Extensions
- Rancher Monitoring
- Grafana
- Prometheus
- Kubernetes
- Vue.js
- TypeScript
- Helm

## Sources Consulted
- Rancher UI Extensions Getting Started: https://extensions.rancher.io/extensions/next/extensions-getting-started
- Rancher UI Extensions Routing: https://extensions.rancher.io/extensions/next/api/nav/routing
- Rancher UI Extensions Custom Page API: https://extensions.rancher.io/extensions/next/api/nav/custom-page
- Rancher Extensions in Rancher Manager: https://ranchermanager.docs.rancher.com/v2.13/integrations-in-rancher/rancher-extensions
- Rancher Enable Monitoring: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Persistent Grafana Dashboards: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Rancher monitoring chart values: https://raw.githubusercontent.com/rancher/charts/dev-v2.14/charts/rancher-monitoring/109.0.1+up80.9.1-rancher.8/values.yaml
- Rancher monitoring chart README: https://raw.githubusercontent.com/rancher/charts/dev-v2.14/charts/rancher-monitoring/109.0.1+up80.9.1-rancher.8/README.md
- Vue Options API lifecycle hooks: https://vuejs.org/api/options-lifecycle
- Vue 3 migration guide: https://v3-migration.vuejs.org/breaking-changes/
- Grafana dashboard JSON model: https://grafana.com/docs/grafana/latest/reference/dashboard/

## Issues Found
- The extension scaffolding command used an outdated package name. I changed it to `npm init @rancher/extension@latest ...` and added the documented legacy tag note for older Rancher versions.
- The `index.ts` example used an outdated extension registration shape. I replaced it with the current documented `plugin.addProduct(...)` and `plugin.addRoutes(...)` pattern and added `importTypes(...)` and package metadata loading.
- The cluster-level route naming and path did not follow Rancher’s documented convention for cluster-level products. I changed the route name and path to the documented `c-cluster-<product>-<page>` pattern with `/c/:cluster/<product>/<page>`.
- The `virtualType` example used `labelKey` with a literal string. I changed it to `label`, which is the correct field for plain text labels.
- The build and deployment section referenced an undocumented `yarn build-helm` flow and a direct Helm install path that does not match Rancher’s documented extension loading workflow. I updated it to use the current Developer Load flow for testing and the documented repository-based installation flow for production.
- The monitoring install command omitted Helm repository setup. I added `helm repo add rancher-charts` and `helm repo update`, and removed redundant `--set` flags because Grafana and Prometheus are enabled by default in current chart values.
- The Grafana ConfigMap example wrapped the dashboard JSON inside a top-level `dashboard` object. I changed it to store the dashboard JSON model directly, which matches Grafana’s documented dashboard JSON model and Rancher’s persistent-dashboard workflow.
- The embedded metrics example used the Vue 2 `beforeDestroy` lifecycle hook. I changed it to Vue 3’s `beforeUnmount`, which is required for current Rancher extension development.
- The events table labeled the timestamp column as `Age` while rendering an absolute timestamp. I changed the heading to `Created`.

## Review Notes
- The Rancher store calls using `findAll` are technically valid, but fetching all pods and events can become expensive on large clusters. Rancher’s newer pagination guidance may be worth considering in a future revision.
- The embedded Prometheus proxy example assumes the default `rancher-monitoring` release name and the `cattle-monitoring-system` namespace. If either is changed during installation, the service proxy URL must be updated to match.
