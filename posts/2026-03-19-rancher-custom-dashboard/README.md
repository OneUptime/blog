# How to Create a Custom Dashboard in Rancher

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Kubernetes, Dashboard, UI Extensions, Monitoring

Description: Learn how to create custom dashboards in Rancher using UI extensions, Grafana integration, and the Rancher monitoring stack.

Custom dashboards in Rancher help teams visualize the metrics and information that matter most to them. This guide covers three approaches: building dashboard pages with Rancher UI extensions, integrating Grafana dashboards, and using the Rancher monitoring stack for custom views.

## Approach 1: Custom Dashboard via Rancher UI Extension

The most integrated approach is building a dashboard page as a Rancher UI extension.

### Step 1: Scaffold the Extension

```bash
npm init @rancher/extension@latest cluster-dashboard
cd cluster-dashboard
yarn install
```

For Rancher v2.9, use `@legacy-v2`; for Rancher v2.7 and v2.8, use `@legacy-v1`.

### Step 2: Create the Dashboard Component

Create `pkg/cluster-dashboard/pages/dashboard.vue`:

```vue
<template>
  <div class="custom-dashboard">
    <h1>Cluster Dashboard</h1>

    <div class="dashboard-grid">
      <!-- Cluster Summary Card -->
      <div class="card">
        <h2>Cluster Summary</h2>
        <div class="metric-row">
          <span class="label">Nodes</span>
          <span class="value">{{ nodes.length }}</span>
        </div>
        <div class="metric-row">
          <span class="label">Namespaces</span>
          <span class="value">{{ namespaces.length }}</span>
        </div>
        <div class="metric-row">
          <span class="label">Total Pods</span>
          <span class="value">{{ pods.length }}</span>
        </div>
      </div>

      <!-- Pod Status Card -->
      <div class="card">
        <h2>Pod Status</h2>
        <div class="metric-row" v-for="(count, status) in podsByStatus" :key="status">
          <span class="label">{{ status }}</span>
          <span class="value" :class="statusClass(status)">{{ count }}</span>
        </div>
      </div>

      <!-- Node Resources Card -->
      <div class="card">
        <h2>Node Resources</h2>
        <div v-for="node in nodes" :key="node.id" class="node-row">
          <strong>{{ node.metadata.name }}</strong>
          <div class="metric-row">
            <span class="label">CPU</span>
            <span class="value">{{ node.status.allocatable.cpu }}</span>
          </div>
          <div class="metric-row">
            <span class="label">Memory</span>
            <span class="value">{{ formatMemory(node.status.allocatable.memory) }}</span>
          </div>
        </div>
      </div>

      <!-- Recent Events Card -->
      <div class="card wide">
        <h2>Recent Events</h2>
        <table class="events-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Reason</th>
              <th>Object</th>
              <th>Message</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="event in recentEvents" :key="event.id"
                :class="{'warning-row': event.type === 'Warning'}">
              <td>{{ event.type }}</td>
              <td>{{ event.reason }}</td>
              <td>{{ event.involvedObject.name }}</td>
              <td>{{ event.message }}</td>
              <td>{{ event.metadata.creationTimestamp }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CustomDashboard',

  async fetch() {
    const [nodes, pods, namespaces, events] = await Promise.all([
      this.$store.dispatch('cluster/findAll', { type: 'node' }),
      this.$store.dispatch('cluster/findAll', { type: 'pod' }),
      this.$store.dispatch('cluster/findAll', { type: 'namespace' }),
      this.$store.dispatch('cluster/findAll', { type: 'event' }),
    ]);

    this.nodes = nodes;
    this.pods = pods;
    this.namespaces = namespaces;
    this.events = events;
  },

  data() {
    return {
      nodes: [],
      pods: [],
      namespaces: [],
      events: [],
    };
  },

  computed: {
    podsByStatus() {
      const statuses = {};
      for (const pod of this.pods) {
        const phase = pod.status?.phase || 'Unknown';
        statuses[phase] = (statuses[phase] || 0) + 1;
      }
      return statuses;
    },

    recentEvents() {
      return [...this.events]
        .sort((a, b) => new Date(b.metadata.creationTimestamp) - new Date(a.metadata.creationTimestamp))
        .slice(0, 20);
    },
  },

  methods: {
    formatMemory(mem) {
      if (!mem) return 'N/A';
      const ki = parseInt(mem);
      if (isNaN(ki)) return mem;
      return `${Math.round(ki / 1024 / 1024)} Gi`;
    },

    statusClass(status) {
      const classes = {
        Running: 'status-ok',
        Succeeded: 'status-ok',
        Pending: 'status-warn',
        Failed: 'status-error',
        Unknown: 'status-error',
      };
      return classes[status] || '';
    },
  },
};
</script>

<style scoped>
.custom-dashboard {
  padding: 20px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-top: 20px;
}

.card {
  background: var(--body-bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 20px;
}

.card.wide {
  grid-column: 1 / -1;
}

.card h2 {
  margin-top: 0;
  border-bottom: 1px solid var(--border);
  padding-bottom: 10px;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
}

.value {
  font-weight: bold;
}

.status-ok { color: var(--success); }
.status-warn { color: var(--warning); }
.status-error { color: var(--error); }

.events-table {
  width: 100%;
  border-collapse: collapse;
}

.events-table th, .events-table td {
  text-align: left;
  padding: 8px;
  border-bottom: 1px solid var(--border);
}

.warning-row {
  background: rgba(255, 165, 0, 0.1);
}
</style>
```

### Step 3: Register the Dashboard Route

Update `pkg/cluster-dashboard/index.ts`:

```typescript
import { importTypes } from '@rancher/auto-import';
import { IPlugin } from '@shell/core/types';

const routes = [
  {
    name: 'c-cluster-cluster-dashboard-dashboard',
    path: '/c/:cluster/cluster-dashboard/dashboard',
    component: () => import('./pages/dashboard.vue'),
    meta: {
      product: 'cluster-dashboard',
    },
  },
];

export default function(plugin: IPlugin) {
  importTypes(plugin);
  plugin.metadata = require('./package.json');
  plugin.addProduct(require('./product'));
  plugin.addRoutes(routes);
}
```

### Step 4: Register as a Product

Create `pkg/cluster-dashboard/product.ts`:

```typescript
import { IPlugin } from '@shell/core/types';

export function init($plugin: IPlugin, store: any) {
  const { product, virtualType, basicType } = $plugin.DSL(store, $plugin.name);

  product({
    icon: 'dashboard',
    inStore: 'cluster',
    weight: 110,
    to: {
      name: 'c-cluster-cluster-dashboard-dashboard',
      params: { product: $plugin.name },
      meta: { product: $plugin.name }
    }
  });

  virtualType({
    name: 'dashboard',
    label: 'Dashboard',
    route: {
      name: 'c-cluster-cluster-dashboard-dashboard',
      params: { product: $plugin.name },
      meta: { product: $plugin.name }
    }
  });

  basicType(['dashboard']);
}
```

### Step 5: Build and Deploy

```bash
# Build the extension package

yarn build-pkg cluster-dashboard
# Serve the package locally for a Developer Load
yarn serve-pkgs
```

Enable **Extension developer features** and use **Extensions > ⋮ > Developer load** to load the built package for testing. For a production installation, publish the extension as a Helm chart and add its repository under **Extensions > ⋮ > Manage Repositories**.

## Approach 2: Grafana Dashboard Integration

Rancher's monitoring stack includes Grafana. You can create custom Grafana dashboards and access them from within Rancher.

### Step 1: Enable Monitoring

Install the Rancher Monitoring chart. Grafana and Prometheus are enabled by default:

```bash
helm repo add rancher-charts https://charts.rancher.io
helm repo update

helm install rancher-monitoring rancher-charts/rancher-monitoring \
  --namespace cattle-monitoring-system \
  --create-namespace
```

### Step 2: Create a Custom Grafana Dashboard

Create a ConfigMap with your dashboard JSON:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: custom-cluster-dashboard
  namespace: cattle-dashboards
  labels:
    grafana_dashboard: "1"
data:
  custom-dashboard.json: |
    {
      "title": "Custom Cluster Overview",
      "uid": "custom-cluster-overview",
      "panels": [
        {
          "title": "CPU Usage by Node",
          "type": "timeseries",
          "datasource": "Prometheus",
          "gridPos": {"h": 8, "w": 12, "x": 0, "y": 0},
          "targets": [
            {
              "expr": "100 - (avg by(instance) (rate(node_cpu_seconds_total{mode=\"idle\"}[5m])) * 100)",
              "legendFormat": "{{ instance }}"
            }
          ]
        },
        {
          "title": "Memory Usage by Node",
          "type": "timeseries",
          "datasource": "Prometheus",
          "gridPos": {"h": 8, "w": 12, "x": 12, "y": 0},
          "targets": [
            {
              "expr": "(1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) * 100",
              "legendFormat": "{{ instance }}"
            }
          ]
        },
        {
          "title": "Pod Count by Namespace",
          "type": "bargauge",
          "datasource": "Prometheus",
          "gridPos": {"h": 8, "w": 12, "x": 0, "y": 8},
          "targets": [
            {
              "expr": "count by(namespace) (kube_pod_info)",
              "legendFormat": "{{ namespace }}"
            }
          ]
        },
        {
          "title": "Container Restart Count",
          "type": "table",
          "datasource": "Prometheus",
          "gridPos": {"h": 8, "w": 12, "x": 12, "y": 8},
          "targets": [
            {
              "expr": "sort_desc(kube_pod_container_status_restarts_total > 5)",
              "legendFormat": "{{ namespace }}/{{ pod }}"
            }
          ]
        }
      ],
      "time": {"from": "now-6h", "to": "now"},
      "refresh": "30s"
    }
```

```bash
kubectl apply -f custom-dashboard-configmap.yaml
```

### Step 3: Access the Dashboard

Navigate to **Monitoring > Grafana** in Rancher, then find your custom dashboard under the dashboards list.

## Approach 3: Embedded Metrics Dashboard

You can embed metrics directly into a Rancher extension by querying Prometheus. This example assumes the default `rancher-monitoring` release name in the `cattle-monitoring-system` namespace:

```vue
<template>
  <div class="metrics-dashboard">
    <h2>Live Metrics</h2>
    <div class="metrics-grid">
      <div class="metric-card" v-for="metric in metrics" :key="metric.name">
        <h3>{{ metric.name }}</h3>
        <span class="metric-value">{{ metric.value }}</span>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      metrics: [],
      refreshInterval: null,
    };
  },

  async mounted() {
    await this.fetchMetrics();
    this.refreshInterval = setInterval(() => this.fetchMetrics(), 30000);
  },

  beforeUnmount() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  },

  methods: {
    async fetchMetrics() {
      const queries = [
        { name: 'CPU Usage', query: 'avg(rate(node_cpu_seconds_total{mode!="idle"}[5m])) * 100' },
        { name: 'Memory Usage', query: '(1 - sum(node_memory_MemAvailable_bytes) / sum(node_memory_MemTotal_bytes)) * 100' },
        { name: 'Pod Count', query: 'count(kube_pod_info)' },
        { name: 'Node Count', query: 'count(kube_node_info)' },
      ];

      this.metrics = await Promise.all(
        queries.map(async (q) => {
          try {
            const response = await this.$store.dispatch('cluster/request', {
              url: `/api/v1/namespaces/cattle-monitoring-system/services/http:rancher-monitoring-prometheus:9090/proxy/api/v1/query?query=${encodeURIComponent(q.query)}`,
            });
            const value = response?.data?.result?.[0]?.value?.[1];
            return {
              name: q.name,
              value: value ? parseFloat(value).toFixed(2) : 'N/A',
            };
          } catch {
            return { name: q.name, value: 'Error' };
          }
        })
      );
    },
  },
};
</script>
```

## Summary

There are three main approaches to creating custom dashboards in Rancher. UI extensions give you the most control and tightest integration with the Rancher interface. Grafana dashboards through the monitoring stack are ideal for time-series metrics visualization. Embedded Prometheus queries in extensions combine both approaches. Choose based on your needs: extensions for custom views and workflows, Grafana for rich metric visualization, or a combination of both.
