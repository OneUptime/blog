# How to Build Custom Rancher UI Extensions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, UI Extensions, Plugin, Dashboard

Description: Step-by-step guide to building custom UI extensions for the Rancher dashboard, including project setup, component development, and deployment.

Rancher UI Extensions let you add custom pages, resource views, and functionality to the Rancher dashboard without modifying the core codebase. This guide walks you through creating, developing, and deploying a custom UI extension from scratch.

## Prerequisites

You need the following tools installed:

- Node.js 16 and yarn
- Git
- Access to a Rancher v2.7, v2.8, or v2.9 instance with Extensions support enabled

## Setting Up the Development Environment

### Step 1: Install the Rancher Extension Creator

Rancher publishes the extension generator through `npm init @rancher/extension` (backed by the `@rancher/create-extension` package). Use the tag that matches your Rancher version:

```bash
# Rancher v2.7 / v2.8
npm init @rancher/extension@legacy-v1 my-extension

# Rancher v2.9
npm init @rancher/extension@legacy-v2 my-extension

cd my-extension
```

This scaffolds a development app with an extension package under `pkg/`, for example:

```plaintext
my-extension/
  pkg/
    my-extension/
      index.ts
      package.json
      product.ts
  package.json
  tsconfig.json
  vue.config.js
```

### Step 2: Install Dependencies

```bash
yarn install
```

### Step 3: Start the Development Server

```bash
API=https://<your-rancher-instance> yarn dev
```

This starts a local development server that proxies requests to your Rancher instance. Open the URL shown in the terminal and log in with your Rancher credentials.

## Creating a Basic Extension

### Define the Extension Entry Point

Edit `pkg/my-extension/index.ts`:

```typescript
import { importTypes } from '@rancher/auto-import';
import { IPlugin } from '@shell/core/types';
import extensionRouting from './routing/extension-routing';

export default function(plugin: IPlugin) {
  importTypes(plugin);
  plugin.metadata = require('./package.json');
  plugin.addProduct(require('./product'));
  plugin.addRoutes(extensionRouting);
}
```

### Register a Product (Cluster-Level Menu Item)

Create `pkg/my-extension/product.ts`:

```typescript
import { IPlugin } from '@shell/core/types';

export function init($plugin: IPlugin, store: any) {
  const {
    product,
    basicType,
    virtualType,
  } = $plugin.DSL(store, $plugin.name);

  // Register a new product in the side navigation
  product({
    icon: 'gear',
    inStore: 'cluster',
    weight: 100,
    to: {
      name: `c-cluster-${$plugin.name}-overview`,
      params: { product: $plugin.name }
    }
  });

  // Register a virtual resource type
  virtualType({
    name: 'overview',
    label: 'Overview',
    route: {
      name: `c-cluster-${$plugin.name}-overview`,
      params: { product: $plugin.name }
    }
  });

  basicType(['overview']);
}
```

### Create a Page Component

Create `pkg/my-extension/pages/overview.vue`:

```vue
<template>
  <div class="overview-page">
    <h1>My Custom Extension</h1>

    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.label">
        <h3>{{ stat.value }}</h3>
        <p>{{ stat.label }}</p>
      </div>
    </div>

    <div class="cluster-info" v-if="currentCluster">
      <h2>Current Cluster</h2>
      <table>
        <tr>
          <td>Name</td>
          <td>{{ currentCluster.nameDisplay || currentCluster.metadata?.name }}</td>
        </tr>
        <tr>
          <td>State</td>
          <td>{{ currentCluster.stateDisplay || currentCluster.metadata?.state?.name || 'Unknown' }}</td>
        </tr>
      </table>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Overview',

  async fetch() {
    this.nodes = await this.$store.dispatch('cluster/findAll', {
      type: 'node'
    });
    this.pods = await this.$store.dispatch('cluster/findAll', {
      type: 'pod'
    });
  },

  data() {
    return {
      nodes: [],
      pods: [],
    };
  },

  computed: {
    currentCluster() {
      return this.$store.getters['currentCluster'];
    },
    stats() {
      return [
        { label: 'Nodes', value: this.nodes.length },
        { label: 'Total Pods', value: this.pods.length },
        {
          label: 'Running Pods',
          value: this.pods.filter(p => p.status?.phase === 'Running').length
        },
        {
          label: 'Namespaces',
          value: new Set(this.pods.map(p => p.metadata?.namespace).filter(Boolean)).size
        }
      ];
    }
  }
};
</script>

<style scoped>
.overview-page {
  padding: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
  margin: 20px 0;
}

.stat-card {
  background: var(--body-bg);
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 16px;
  text-align: center;
}

.stat-card h3 {
  font-size: 2em;
  margin: 0;
}
</style>
```

### Register Routes

Create `pkg/my-extension/routing/extension-routing.js`:

```typescript
import OverviewPage from '../pages/overview.vue';

const routes = [
  {
    name: 'c-cluster-my-extension-overview',
    path: '/c/:cluster/my-extension/overview',
    component: OverviewPage,
    meta: {
      product: 'my-extension',
    }
  }
];

export default routes;
```

## Adding Custom Resource Views

### Create a List View for a Custom Resource

Create `pkg/my-extension/list/my-resource.vue`:

```vue
<template>
  <ResourceTable
    :schema="schema"
    :rows="rows"
    :headers="headers"
    :loading="loading"
    :force-update-live-and-delayed="forceUpdateLiveAndDelayed"
  />
</template>

<script>
import ResourceTable from '@shell/components/ResourceTable';
import ResourceFetch from '@shell/mixins/resource-fetch';

export default {
  name: 'MyResourceList',
  components: { ResourceTable },
  mixins: [ResourceFetch],

  props: {
    resource: {
      type: String,
      required: true,
    },
    schema: {
      type: Object,
      required: true,
    }
  },

  async fetch() {
    this.$initializeFetchData(this.resource);
    await this.$fetchType(this.resource);
  },

  computed: {
    headers() {
      return this.$store.getters['type-map/headersFor'](this.schema);
    }
  }
};
</script>
```

## Adding Actions and Buttons

### Custom Action on Resources

```typescript
// pkg/my-extension/index.ts
import { importTypes } from '@rancher/auto-import';
import { IPlugin, ActionLocation, ActionOpts } from '@shell/core/types';
import extensionRouting from './routing/extension-routing';

export default function(plugin: IPlugin) {
  importTypes(plugin);
  plugin.metadata = require('./package.json');
  plugin.addProduct(require('./product'));
  plugin.addRoutes(extensionRouting);

  plugin.addAction(
    ActionLocation.TABLE,
    { resource: ['apps.deployment'] },
    {
      label: 'Restart',
      multiple: true,
      invoke(opts: ActionOpts, values: any[]) {
        console.log('Selected deployments', opts, values);
      }
    }
  );
}
```

## Building for Production

### Build the Extension

```bash
yarn build-pkg my-extension
```

This creates a production bundle in the `dist-pkg` directory.

### Create Helm Chart Assets for Distribution

```bash
yarn publish-pkgs -s "my-organization/my-extension-repo" -b "gh-pages"
```

This bundles the extension, generates the chart assets in `charts/`, packages them under `assets/`, and writes the repository index files needed by Rancher.

### Publish to a Public Repository

```bash
git add ./tmp/*
git commit -m 'Add extension charts'
git push origin gh-pages
```

## Deploying the Extension

### Add the Repository to Rancher

After publishing the generated assets, use the repository URL for that branch, for example `https://<organization>.github.io/<repository>`.

### Deploy via the Rancher UI

1. Go to **Apps** > **Repositories** and add your published repository URL
2. Open **Extensions** in the Rancher sidebar
3. Select the **Available** tab
4. Find your extension and install it

## Testing Your Extension

### Unit Tests

The generated scaffold does not include a `test` script by default. Add your preferred test runner and a `test` script to `package.json` before running unit tests.

### End-to-End Testing

The scaffold also does not include Cypress or a `test:e2e` script by default. Add your preferred E2E runner and script before running end-to-end tests.

## Summary

Building Rancher UI Extensions involves scaffolding a development app with the Rancher extension creator, defining products and routes through the Extensions API, creating Vue components for custom pages and resource views, and publishing the generated chart assets for Rancher to consume. The extension system provides access to the Rancher store for data fetching, built-in UI components like `ResourceTable`, and APIs such as the DSL helpers and `addAction` for extending navigation and table behavior.
