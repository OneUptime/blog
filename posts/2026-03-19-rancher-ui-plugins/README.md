# How to Develop Rancher UI Plugins

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, UI Extensions, Plugin, Dashboard

Description: Comprehensive guide to developing Rancher UI plugins, covering the plugin architecture, DSL, store access, component reuse, and advanced customization patterns.

Rancher UI plugins extend the dashboard with custom functionality, resource types, and integrations. This guide goes deep into plugin development, covering the architecture, available APIs, advanced patterns, and real-world examples.

## Plugin Architecture Overview

Rancher UI plugins are packaged Vue.js extensions that run within the Rancher dashboard shell. They are loaded dynamically and have access to:

- **The Rancher Store**: Vuex store with cluster data, user info, and configuration
- **The Plugin DSL**: Methods for registering products, types, and navigation items
- **Shell Components**: Pre-built UI components like tables, forms, and banners
- **Cluster API Proxy**: Access to Kubernetes APIs through the Rancher proxy

## Creating a Plugin Project

### Initialize the Project

For Rancher v2.10 and later:

```bash
npm init @rancher/extension@latest my-plugin
cd my-plugin
yarn install
```

### Project Structure

```plaintext
my-plugin/
  pkg/
    my-plugin/
      index.ts              # Plugin entry point
      product.ts            # Product registration
      package.json          # Extension metadata
      routing/
        extension-routing.ts
      pages/                # Page components
      components/           # Reusable components
      detail/               # Custom detail views
      edit/                 # Custom create/edit views
      list/                 # Custom list views
      models/               # Resource model overrides
      store/                # Custom Vuex stores
      l10n/                 # Translations
        en-us.yaml
  package.json
  tsconfig.json
```

## The Plugin DSL

The Plugin DSL provides methods for registering your plugin with the Rancher shell.

### Registering a Product

```typescript
// product.ts
import { IPlugin } from '@shell/core/types';

const BLANK_CLUSTER = '_';

export function init($plugin: IPlugin, store: any) {
  const {
    product,
    basicType,
    virtualType,
  } = $plugin.DSL(store, $plugin.name);

  // Register product in the top navigation
  product({
    icon: 'gear',
    inStore: 'management',
    weight: 100,
    to: {
      name: `${$plugin.name}-c-cluster-overview`,
      params: {
        product: $plugin.name,
        cluster: BLANK_CLUSTER
      }
    }
  });

  // Register pages
  virtualType({
    name: 'overview',
    labelKey: 'nav.overview',
    route: {
      name: `${$plugin.name}-c-cluster-overview`,
      params: {
        product: $plugin.name,
        cluster: BLANK_CLUSTER
      }
    }
  });

  virtualType({
    name: 'settings',
    labelKey: 'nav.settings',
    route: {
      name: `${$plugin.name}-c-cluster-settings`,
      params: {
        product: $plugin.name,
        cluster: BLANK_CLUSTER
      }
    }
  });

  // Group types in navigation
  basicType(['overview', 'settings']);
}
```

### Registering Real Kubernetes Resource Types

```typescript
export function init($plugin: IPlugin, store: any) {
  const { product, basicType, configureType, weightType } = $plugin.DSL(store, $plugin.name);

  product({
    icon: 'gear',
    inStore: 'cluster',
    weight: 90,
    to: {
      name: `c-cluster-${$plugin.name}-resource`,
      params: {
        product: $plugin.name,
        resource: 'my.company.io.myresource'
      }
    }
  });

  // Register a CRD-backed type
  configureType('my.company.io.myresource', {
    isCreatable: true,
    isEditable: true,
    isRemovable: true,
    showAge: true,
    showState: true,
    canYaml: true,
    customRoute: {
      name: `c-cluster-${$plugin.name}-resource`,
      params: {
        product: $plugin.name,
        resource: 'my.company.io.myresource'
      }
    }
  });

  // Set display weight (order in navigation)
  weightType('my.company.io.myresource', 100);

  basicType(['my.company.io.myresource']);
}
```

## Working with the Rancher Store

### Fetching Resources

```typescript
// In a Vue component
export default {
  async fetch() {
    // Fetch all resources of a type
    this.deployments = await this.$store.dispatch('cluster/findAll', {
      type: 'apps.deployment'
    });

    // Fetch a single resource
    this.myPod = await this.$store.dispatch('cluster/find', {
      type: 'pod',
      id: 'default/my-pod'
    });

    // Fetch with custom options
    this.nodes = await this.$store.dispatch('cluster/findAll', {
      type: 'node',
      opt: { force: true }  // Force refresh from API
    });
  }
};
```

### Accessing Schemas

```typescript
// Check if a resource type exists
const schema = this.$store.getters['cluster/schemaFor']('apps.deployment');
if (schema) {
  console.log('Deployment schema available');
}

// Get all schemas
const allSchemas = this.$store.getters['cluster/all']('schema');
```

### Making Custom API Requests

```typescript
// GET request through the cluster proxy
const response = await this.$store.dispatch('cluster/request', {
  url: '/api/v1/namespaces',
  method: 'GET'
});

// POST request
await this.$store.dispatch('cluster/request', {
  url: '/api/v1/namespaces',
  method: 'POST',
  data: {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: { name: 'new-namespace' }
  }
});
```

## Custom Resource Models

Override how resources are displayed and behave by creating model classes:

```typescript
// models/my.company.io.myresource.js
import SteveModel from '@shell/plugins/steve/steve-class';

export default class MyResource extends SteveModel {
  // Custom display name
  get nameDisplay() {
    return this.spec?.friendlyName || this.metadata?.name || 'Unknown';
  }

  // Custom state computation
  get stateDisplay() {
    if (this.status?.ready) return 'Ready';
    if (this.status?.processing) return 'Processing';
    return 'Pending';
  }

  // Custom state color
  get stateColor() {
    const state = this.stateDisplay;
    if (state === 'Ready') return 'text-success';
    if (state === 'Processing') return 'text-info';
    return 'text-warning';
  }

  // Available actions in the context menu
  get _availableActions() {
    const actions = super._availableActions;

    actions.unshift({
      action: 'customAction',
      label: 'Run Diagnostics',
      icon: 'icon icon-search',
      enabled: this.stateDisplay === 'Ready',
    });

    return actions;
  }

  // Implement the custom action
  async customAction() {
    return await this.$dispatch('request', {
      url: `/apis/my.company.io/v1/namespaces/${this.metadata.namespace}/myresources/${this.metadata.name}/diagnostics`,
      method: 'POST'
    });
  }
}
```

## Custom List Columns

Define custom columns for resource list views:

```typescript
// product.ts
import { IPlugin } from '@shell/core/types';

export function init($plugin: IPlugin, store: any) {
  const { headers } = $plugin.DSL(store, $plugin.name);

  headers('my.company.io.myresource', [
    {
      name: 'name',
      label: 'Name',
      value: 'nameDisplay',
      sort: ['nameSort'],
      width: 200,
    },
    {
      name: 'status',
      label: 'Status',
      value: 'stateDisplay',
      sort: ['stateSort', 'nameSort'],
      width: 120,
      formatter: 'BadgeStateFormatter',
    },
    {
      name: 'version',
      label: 'Version',
      value: 'spec.version',
      sort: ['spec.version'],
    },
    {
      name: 'replicas',
      label: 'Replicas',
      value: 'spec.replicas',
      sort: ['spec.replicas:desc'],
      width: 100,
    },
    {
      name: 'age',
      label: 'Age',
      value: 'creationTimestamp',
      sort: ['creationTimestamp:desc'],
      formatter: 'LiveDate',
      width: 120,
    }
  ]);
}
```

## Custom Create and Edit Forms

Create forms for your custom resources:

```vue
<!-- edit/my.company.io.myresource.vue -->
<template>
  <CruResource
    :resource="value"
    :mode="mode"
    :errors="errors"
    @finish="save"
    @error="e => errors = e"
  >
    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model="value.metadata.name"
          label="Name"
          :mode="mode"
          required
        />
      </div>
      <div class="col span-6">
        <LabeledInput
          v-model="value.spec.version"
          label="Version"
          :mode="mode"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-6">
        <LabeledInput
          v-model.number="value.spec.replicas"
          label="Replicas"
          type="number"
          :mode="mode"
          :min="1"
          :max="100"
        />
      </div>
      <div class="col span-6">
        <LabeledSelect
          v-model="value.spec.tier"
          label="Tier"
          :options="tierOptions"
          :mode="mode"
        />
      </div>
    </div>

    <div class="row mb-20">
      <div class="col span-12">
        <KeyValue
          v-model="value.spec.config"
          title="Configuration"
          :mode="mode"
          :add-label="'Add Config Entry'"
        />
      </div>
    </div>
  </CruResource>
</template>

<script>
import CruResource from '@shell/components/CruResource';
import LabeledInput from '@components/Form/LabeledInput/LabeledInput';
import LabeledSelect from '@shell/components/form/LabeledSelect';
import KeyValue from '@shell/components/form/KeyValue';
import CreateEditView from '@shell/mixins/create-edit-view';

export default {
  name: 'MyResourceEdit',
  components: {
    CruResource,
    LabeledInput,
    LabeledSelect,
    KeyValue,
  },
  mixins: [CreateEditView],

  created() {
    this.value.metadata = this.value.metadata || {};
    this.value.spec = this.value.spec || {};
  },

  data() {
    return {
      tierOptions: [
        { label: 'Free', value: 'free' },
        { label: 'Standard', value: 'standard' },
        { label: 'Premium', value: 'premium' },
      ],
    };
  },
};
</script>
```

## Internationalization (i18n)

Add translations for your plugin:

```yaml
# l10n/en-us.yaml

product:
  my-plugin: "My Plugin"

typeLabel:
  "my.company.io.myresource": |-
    {count, plural,
      one { My Resource }
      other { My Resources }
    }

nav:
  overview: "Overview"
  settings: "Settings"
```

Use the standard extension entry:

```typescript
// index.ts
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

## Development Workflow

### Running in Development Mode

```bash
# Set the Rancher API URL
API=https://rancher.example.com yarn dev
```

### Hot Module Replacement

The development server supports HMR, so changes to Vue components are reflected immediately without a full page reload.

### Debugging

Use Vue DevTools in your browser to inspect the Vuex store, component hierarchy, and events. The Rancher store contains all fetched resources under `cluster/all` getters.

### Building and Publishing

```bash
# Build the plugin package
yarn build-pkg my-plugin

# Generate Helm assets for a public GitHub repo
yarn publish-pkgs -s "my-organization/my-plugin-repo" -b "gh-pages"
```

## Summary

Developing Rancher UI plugins involves using the Plugin DSL to register products and resource types, creating Vue components for pages and forms, defining custom resource models for behavior overrides, and packaging everything as a Helm-distributed extension. The plugin architecture provides full access to the Rancher store for data fetching, pre-built shell components for consistent UI, and internationalization support. Start with simple virtual types and pages, then progress to custom CRD management with models, list columns, and edit forms.
