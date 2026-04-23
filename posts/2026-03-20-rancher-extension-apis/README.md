# How to Use Rancher Extension APIs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Extension, API, UI

Description: Learn how to use Rancher Extension APIs to build custom UI components, register routes, and integrate with Rancher's core services.

## Introduction

Rancher's UI Extensions APIs provide a rich set of hooks and utilities that let extension developers register custom pages, panels, actions, and resource detail tabs directly into the Rancher dashboard. This guide covers the most important API surfaces and how to use them effectively.

## Prerequisites

- A scaffolded Rancher Extension project (`npm init @rancher/extension@latest my-ext`)
- Familiarity with Vue 3 and the Composition API
- Node.js 20 and Yarn

## Extension Entry Point

Every extension registers itself through an `index.js` (or `index.ts`) that exports a default function receiving the plugin instance:

```javascript
// pkg/my-extension/index.js
import { importTypes } from '@rancher/auto-import';
import extensionRouting from './routing/extension-routing';

// This function is called when Rancher loads the extension
export default function(plugin) {
  // Auto-import model, detail, and edit views from the extension folders
  importTypes(plugin);

  // Expose extension metadata from package.json
  plugin.metadata = require('./package.json');

  // Register the extension product and its routes
  plugin.addProduct(require('./product'));
  plugin.addRoutes(extensionRouting);
}
```

## Registering Resource Detail Tabs

For newer Rancher releases, add a custom tab to a resource detail page (for example, Deployments):

```javascript
import { TabLocation } from '@shell/core/types';

// Add a tab to the Deployment detail view
plugin.addTab(
  TabLocation.RESOURCE_DETAIL_PAGE,
  { resource: ['apps.deployment'] },
  {
    name:      'my-metrics-tab',
    label:     'Custom Metrics',
    component: () => import('./tabs/MetricsTab.vue'),
    weight:    100, // Controls tab order (higher = later)
  }
);
```

```vue
<!-- tabs/MetricsTab.vue -->
<template>
  <div>
    <h2>Custom Metrics for {{ resource.metadata.name }}</h2>
    <!-- Render your charts here -->
  </div>
</template>

<script setup>
// The `resource` prop is automatically injected with the current resource object
defineProps({ resource: Object });
</script>
```

## Registering Action Buttons

Inject custom action buttons into resource list views or the Rancher header. For example, add a bulk action to the Pod list view:

```javascript
import { ActionLocation } from '@shell/core/types';

plugin.addAction(
  ActionLocation.TABLE,
  { resource: ['pod'] },
  {
    label:    'Restart Selected',
    icon:     'icon-pipeline',
    multiple: true, // Show as a bulk action
    invoke(opts, resources) {
      resources.forEach((pod) => {
        console.log('Restart pod:', pod.metadata.name);
      });
    },
  }
);
```

## Using the Store

Extensions have access to Rancher's Vuex store through Vuex's `useStore` composable:

```javascript
// Fetch all deployments from the current cluster
import { useStore } from 'vuex';

const store = useStore();

// Dispatch a find-all request
const deployments = await store.dispatch('cluster/findAll', {
  type: 'apps.deployment',
});
```

## Making API Requests

Store modules also expose a low-level `request` action for raw HTTP calls. Prefer `findAll` or `findPage` for resource collections, and use `request` when you need a specific endpoint:

```javascript
import { useStore } from 'vuex';

const store = useStore();
const clusterId = store.getters['clusterId'];

// GET request to the current cluster's Kubernetes API
const pods = await store.dispatch('cluster/request', {
  method: 'GET',
  url:    `/k8s/clusters/${ clusterId }/api/v1/namespaces/default/pods`,
});
```

## Registering Panels

Add a panel above a resource list or inside a resource detail view:

```javascript
import { PanelLocation } from '@shell/core/types';

plugin.addPanel(
  PanelLocation.RESOURCE_LIST,
  { resource: ['catalog.cattle.io.app'] },
  { component: () => import('./panels/SummaryPanel.vue') }
);
```

## Listening to Extension Events

Extensions can subscribe to navigation and lifecycle hooks:

```javascript
plugin.addNavHooks({
  async onEnter(store, { clusterId, product }) {
    console.log('Entered product', product, 'for cluster', clusterId);
    // Refresh your data here
  },
});
```

## Conclusion

The Rancher Extension API provides all the building blocks needed to deeply integrate custom functionality into the Rancher dashboard. By leveraging route registration, resource tabs, action buttons, store access, and panel APIs, you can build powerful extensions that feel like native parts of the platform. Always consult the `@rancher/shell` source and the official Rancher Extension documentation for the latest API signatures.
