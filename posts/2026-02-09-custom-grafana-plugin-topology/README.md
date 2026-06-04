# How to Build a Custom Grafana Plugin for Kubernetes Topology Visualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafana, Kubernetes, Visualization

Description: Learn how to develop a custom Grafana panel plugin that visualizes Kubernetes cluster topology, showing relationships between nodes, pods, services, and deployments in an interactive graph.

---

Standard Grafana panels excel at showing time-series data, but visualizing Kubernetes topology requires a different approach. A custom topology plugin displays the relationships between cluster resources as an interactive graph, helping you understand dependencies, identify bottlenecks, and troubleshoot connectivity issues at a glance.

This guide walks through building a Grafana panel plugin that queries Kubernetes metrics and renders cluster topology as a force-directed graph.

## Understanding Grafana Plugin Architecture

Grafana plugins consist of three main components:

- **Frontend** - React component that renders the panel
- **Backend (optional)** - Go server for data processing
- **Plugin configuration** - JSON metadata describing the plugin

For a topology visualization, we'll build a frontend-only plugin that queries Prometheus metrics and renders them using D3.js or a similar graph library.

## Setting Up the Development Environment

Initialize your plugin development environment:

```bash
# Create plugin scaffold
npx @grafana/create-plugin@latest

# Follow prompts:
# - Plugin name: kubernetes-topology
# - Plugin type: panel
# - Description: Kubernetes cluster topology visualization

# Install dependencies in the generated plugin directory
cd <your-plugin-directory>
npm install
```

After scaffolding the plugin and adding the topology files below, the plugin structure looks like this:

```text
kubernetes-topology/
├── src/
│   ├── module.ts          # Plugin entry point
│   ├── TopologyPanel.tsx  # Main panel component
│   ├── types.ts           # TypeScript interfaces
│   └── plugin.json        # Plugin metadata
├── package.json
└── tsconfig.json
```

## Defining the Data Model

Create TypeScript interfaces for Kubernetes topology data:

```typescript
// src/types.ts
export interface KubernetesNode {
  id: string;
  name: string;
  type: 'node' | 'pod' | 'service' | 'deployment';
  namespace?: string;
  status: 'healthy' | 'warning' | 'error';
  metadata?: {
    nodeName?: string;
    ownerName?: string;
    labels?: Record<string, string>;
  };
  metrics?: {
    cpu?: number;
    memory?: number;
    network?: number;
  };
}

export interface KubernetesEdge {
  source: string;
  target: string;
  type: 'hosts' | 'routes-to' | 'manages';
  weight?: number;
}

export interface TopologyData {
  nodes: KubernetesNode[];
  edges: KubernetesEdge[];
}

export interface TopologyOptions {
  showNodes: boolean;
  showPods: boolean;
  showServices: boolean;
  showDeployments: boolean;
  namespaceFilter: string;
  layoutType: 'force' | 'hierarchical' | 'circular';
  colorScheme: 'status' | 'type' | 'namespace';
}
```

## Implementing the Panel Component

Build the main React component for the topology panel:

```typescript
// src/TopologyPanel.tsx
import React, { useEffect, useRef } from 'react';
import { PanelProps } from '@grafana/data';
import { TopologyOptions } from './types';
import { renderTopologyGraph } from './topology/GraphRenderer';
import { transformMetricsToTopology } from './topology/DataTransformer';

interface Props extends PanelProps<TopologyOptions> {}

export const TopologyPanel: React.FC<Props> = ({
  options,
  data,
  width,
  height
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !data.series.length) {
      return;
    }

    // Transform Prometheus metrics to topology data
    const topologyData = transformMetricsToTopology(data.series, options);

    // Render graph
    renderTopologyGraph(
      containerRef.current,
      topologyData,
      { width, height },
      options
    );
  }, [data, options, width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    />
  );
};
```

## Transforming Metrics to Topology

Create a transformer that converts Prometheus metrics into topology data:

```typescript
// src/topology/DataTransformer.ts
import { DataFrame } from '@grafana/data';
import { TopologyData, KubernetesNode, KubernetesEdge, TopologyOptions } from '../types';

export function transformMetricsToTopology(
  series: DataFrame[],
  options: TopologyOptions
): TopologyData {
  const edges: KubernetesEdge[] = [];
  const nodeMap = new Map<string, KubernetesNode>();
  const podStatuses = new Map<string, 'healthy' | 'warning' | 'error'>();
  const podOwners = new Map<string, string>();

  // Process each metric series
  series.forEach(frame => {
    const metric = getMetricName(frame);

    // Extract kube-state-metrics data
    if (metric.includes('kube_node_info')) {
      extractNodes(frame, nodeMap, options);
    } else if (metric.includes('kube_pod_info')) {
      extractPods(frame, nodeMap, options);
    } else if (metric.includes('kube_pod_status_phase')) {
      extractPodStatuses(frame, podStatuses);
    } else if (metric.includes('kube_pod_owner')) {
      extractPodOwners(frame, podOwners);
    } else if (metric.includes('kube_pod_labels')) {
      extractPodLabels(frame, nodeMap);
    } else if (metric.includes('kube_service_labels')) {
      extractServices(frame, nodeMap, options);
    } else if (metric.includes('kube_deployment_labels')) {
      extractDeployments(frame, nodeMap, options);
    }
  });

  podStatuses.forEach((status, podId) => {
    const pod = nodeMap.get(podId);
    if (pod) {
      pod.status = status;
    }
  });

  podOwners.forEach((ownerId, podId) => {
    const pod = nodeMap.get(podId);
    if (pod) {
      pod.metadata = { ...pod.metadata, ownerName: ownerId };
    }
  });

  // Build edges based on relationships
  nodeMap.forEach(node => {
    if (node.type === 'pod' && node.metadata?.nodeName) {
      edges.push({
        source: node.metadata.nodeName,
        target: node.id,
        type: 'hosts'
      });
    }

    if (node.type === 'pod' && node.metadata?.ownerName && nodeMap.has(node.metadata.ownerName)) {
      edges.push({
        source: node.metadata.ownerName,
        target: node.id,
        type: 'manages'
      });
    }

    if (node.type === 'service' && node.metadata?.labels) {
      // kube-state-metrics does not expose Service selectors; this uses common app labels as a convention.
      nodeMap.forEach(pod => {
        if (pod.type === 'pod' && matchesServiceLabels(pod, node)) {
          edges.push({
            source: node.id,
            target: pod.id,
            type: 'routes-to'
          });
        }
      });
    }
  });

  return {
    nodes: Array.from(nodeMap.values()),
    edges
  };
}

function getMetricName(frame: DataFrame): string {
  return [frame.name, ...frame.fields.map(field => field.name)].filter(Boolean).join(' ');
}

function getResourceId(namespace: string | undefined, name: string): string {
  return namespace ? `${namespace}/${name}` : name;
}

function extractPods(
  frame: DataFrame,
  nodeMap: Map<string, KubernetesNode>,
  options: TopologyOptions
): void {
  if (!options.showPods) return;

  frame.fields.forEach(field => {
    const labels = field.labels || {};
    const namespace = labels.namespace;

    // Apply namespace filter
    if (options.namespaceFilter && namespace !== options.namespaceFilter) {
      return;
    }

    const podName = labels.pod;
    const nodeName = labels.node;
    const podId = podName ? getResourceId(namespace, podName) : undefined;

    if (podName && podId && !nodeMap.has(podId)) {
      nodeMap.set(podId, {
        id: podId,
        name: podName,
        type: 'pod',
        namespace,
        status: 'warning',
        metadata: {
          nodeName,
        }
      });
    }
  });
}

function extractPodStatuses(
  frame: DataFrame,
  podStatuses: Map<string, 'healthy' | 'warning' | 'error'>
): void {
  frame.fields.forEach(field => {
    const labels = field.labels || {};
    const podName = labels.pod;
    const namespace = labels.namespace;
    const phase = labels.phase;
    const values = field.values as number[];
    const value = values[values.length - 1];

    if (podName && phase && value === 1) {
      podStatuses.set(getResourceId(namespace, podName), mapPodPhaseToStatus(phase));
    }
  });
}

function extractPodOwners(
  frame: DataFrame,
  podOwners: Map<string, string>
): void {
  frame.fields.forEach(field => {
    const labels = field.labels || {};
    const podName = labels.pod;
    const namespace = labels.namespace;
    const ownerName = labels.owner_name;
    const ownerKind = labels.owner_kind;
    const isController = labels.owner_is_controller;

    if (podName && ownerName && ownerKind === 'ReplicaSet' && isController !== 'false') {
      const deploymentName = ownerName.replace(/-[a-f0-9]{8,10}$/, '');
      podOwners.set(getResourceId(namespace, podName), getResourceId(namespace, deploymentName));
    }
  });
}

function extractPodLabels(
  frame: DataFrame,
  nodeMap: Map<string, KubernetesNode>
): void {
  frame.fields.forEach(field => {
    const labels = field.labels || {};
    const podName = labels.pod;
    const namespace = labels.namespace;
    const pod = podName ? nodeMap.get(getResourceId(namespace, podName)) : undefined;

    if (!pod) {
      return;
    }

    pod.metadata = {
      ...pod.metadata,
      labels: extractKubernetesLabels(labels, 'label_')
    };
  });
}

function extractNodes(
  frame: DataFrame,
  nodeMap: Map<string, KubernetesNode>,
  options: TopologyOptions
): void {
  if (!options.showNodes) return;

  frame.fields.forEach(field => {
    const labels = field.labels || {};
    const nodeName = labels.node;

    if (nodeName && !nodeMap.has(nodeName)) {
      nodeMap.set(nodeName, {
        id: nodeName,
        name: nodeName,
        type: 'node',
        status: 'healthy'
      });
    }
  });
}

function extractServices(
  frame: DataFrame,
  nodeMap: Map<string, KubernetesNode>,
  options: TopologyOptions
): void {
  if (!options.showServices) return;

  frame.fields.forEach(field => {
    const labels = field.labels || {};
    const namespace = labels.namespace;

    if (options.namespaceFilter && namespace !== options.namespaceFilter) {
      return;
    }

    const serviceName = labels.service;
    const serviceId = serviceName ? getResourceId(namespace, serviceName) : undefined;

    if (serviceName && serviceId && !nodeMap.has(serviceId)) {
      nodeMap.set(serviceId, {
        id: serviceId,
        name: serviceName,
        type: 'service',
        namespace,
        status: 'healthy',
        metadata: {
          labels: extractKubernetesLabels(labels, 'label_')
        }
      });
    }
  });
}

function extractDeployments(
  frame: DataFrame,
  nodeMap: Map<string, KubernetesNode>,
  options: TopologyOptions
): void {
  if (!options.showDeployments) return;

  frame.fields.forEach(field => {
    const labels = field.labels || {};
    const namespace = labels.namespace;

    if (options.namespaceFilter && namespace !== options.namespaceFilter) {
      return;
    }

    const deploymentName = labels.deployment;
    const deploymentId = deploymentName ? getResourceId(namespace, deploymentName) : undefined;

    if (deploymentName && deploymentId && !nodeMap.has(deploymentId)) {
      nodeMap.set(deploymentId, {
        id: deploymentId,
        name: deploymentName,
        type: 'deployment',
        namespace,
        status: 'healthy',
        metadata: {
          labels: extractKubernetesLabels(labels, 'label_')
        }
      });
    }
  });
}

function mapPodPhaseToStatus(phase: string): 'healthy' | 'warning' | 'error' {
  switch (phase.toLowerCase()) {
    case 'running':
      return 'healthy';
    case 'pending':
      return 'warning';
    case 'failed':
    case 'unknown':
      return 'error';
    default:
      return 'warning';
  }
}

function extractKubernetesLabels(labels: Record<string, string>, prefix: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(labels)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, value]) => [key.slice(prefix.length), value])
  );
}

function matchesServiceLabels(pod: KubernetesNode, service: KubernetesNode): boolean {
  const podLabels = pod.metadata?.labels || {};
  const serviceLabels = service.metadata?.labels || {};
  const appLabel = serviceLabels.app || serviceLabels['app_kubernetes_io_name'];

  return Boolean(appLabel && (
    podLabels.app === appLabel ||
    podLabels['app_kubernetes_io_name'] === appLabel
  ));
}
```

## Rendering the Topology Graph

Implement graph rendering using D3.js:

```typescript
// src/topology/GraphRenderer.ts
import * as d3 from 'd3';
import { TopologyData, TopologyOptions } from '../types';

export function renderTopologyGraph(
  container: HTMLElement,
  data: TopologyData,
  dimensions: { width: number; height: number },
  options: TopologyOptions
): void {
  // Clear previous render
  d3.select(container).selectAll('*').remove();

  // Create SVG
  const svg = d3.select(container)
    .append('svg')
    .attr('width', dimensions.width)
    .attr('height', dimensions.height);

  // Create zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom as any);

  const g = svg.append('g');

  // Create force simulation
  const simulation = d3.forceSimulation(data.nodes)
    .force('link', d3.forceLink(data.edges).id((d: any) => d.id).distance(100))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
    .force('collision', d3.forceCollide().radius(30));

  // Render edges
  const link = g.append('g')
    .selectAll('line')
    .data(data.edges)
    .join('line')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .attr('stroke-width', 2)
    .attr('marker-end', 'url(#arrowhead)');

  // Add arrow markers
  svg.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '-0 -5 10 10')
    .attr('refX', 25)
    .attr('refY', 0)
    .attr('orient', 'auto')
    .attr('markerWidth', 8)
    .attr('markerHeight', 8)
    .append('path')
    .attr('d', 'M 0,-5 L 10,0 L 0,5')
    .attr('fill', '#999');

  // Render nodes
  const node = g.append('g')
    .selectAll('g')
    .data(data.nodes)
    .join('g')
    .call(drag(simulation) as any);

  // Add circles for nodes
  node.append('circle')
    .attr('r', d => getNodeRadius(d))
    .attr('fill', d => getNodeColor(d, options))
    .attr('stroke', d => getNodeStroke(d))
    .attr('stroke-width', 2);

  // Add icons for node types
  node.append('text')
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .attr('font-size', '16px')
    .text(d => getNodeIcon(d));

  // Add labels
  node.append('text')
    .attr('dx', 0)
    .attr('dy', 25)
    .attr('text-anchor', 'middle')
    .attr('font-size', '10px')
    .text(d => d.name);

  // Add tooltips
  node.append('title')
    .text(d => `${d.type}: ${d.name}\nStatus: ${d.status}\nNamespace: ${d.namespace || 'N/A'}`);

  // Update positions on simulation tick
  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
  });
}

function drag(simulation: any) {
  function dragstarted(event: any) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    event.subject.fx = event.subject.x;
    event.subject.fy = event.subject.y;
  }

  function dragged(event: any) {
    event.subject.fx = event.x;
    event.subject.fy = event.y;
  }

  function dragended(event: any) {
    if (!event.active) simulation.alphaTarget(0);
    event.subject.fx = null;
    event.subject.fy = null;
  }

  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}

function getNodeRadius(node: any): number {
  switch (node.type) {
    case 'node':
      return 20;
    case 'deployment':
      return 18;
    case 'service':
      return 15;
    case 'pod':
      return 12;
    default:
      return 10;
  }
}

function getNodeColor(node: any, options: TopologyOptions): string {
  if (options.colorScheme === 'status') {
    switch (node.status) {
      case 'healthy':
        return '#52c41a';
      case 'warning':
        return '#faad14';
      case 'error':
        return '#f5222d';
      default:
        return '#d9d9d9';
    }
  } else if (options.colorScheme === 'type') {
    switch (node.type) {
      case 'node':
        return '#1890ff';
      case 'deployment':
        return '#722ed1';
      case 'service':
        return '#13c2c2';
      case 'pod':
        return '#52c41a';
      default:
        return '#d9d9d9';
    }
  }

  // Color by namespace
  return getNamespaceColor(node.namespace);
}

function getNodeStroke(node: any): string {
  return node.status === 'error' ? '#f5222d' : '#fff';
}

function getNodeIcon(node: any): string {
  switch (node.type) {
    case 'node':
      return '🖥️';
    case 'deployment':
      return '📦';
    case 'service':
      return '🔌';
    case 'pod':
      return '⬢';
    default:
      return '●';
  }
}

function getNamespaceColor(namespace: string | undefined): string {
  // Simple hash-based color generation
  if (!namespace) return '#d9d9d9';

  let hash = 0;
  for (let i = 0; i < namespace.length; i++) {
    hash = namespace.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}
```

## Adding Panel Options

Create configuration options for the panel:

```typescript
// src/module.ts
import { PanelPlugin } from '@grafana/data';
import { TopologyPanel } from './TopologyPanel';
import { TopologyOptions } from './types';

export const plugin = new PanelPlugin<TopologyOptions>(TopologyPanel)
  .setPanelOptions(builder => {
    return builder
      .addBooleanSwitch({
        path: 'showNodes',
        name: 'Show Nodes',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'showPods',
        name: 'Show Pods',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'showServices',
        name: 'Show Services',
        defaultValue: true,
      })
      .addBooleanSwitch({
        path: 'showDeployments',
        name: 'Show Deployments',
        defaultValue: true,
      })
      .addTextInput({
        path: 'namespaceFilter',
        name: 'Namespace Filter',
        description: 'Filter topology to specific namespace',
        defaultValue: '',
      })
      .addRadio({
        path: 'layoutType',
        name: 'Layout Type',
        defaultValue: 'force',
        settings: {
          options: [
            { value: 'force', label: 'Force-Directed' },
            { value: 'hierarchical', label: 'Hierarchical' },
            { value: 'circular', label: 'Circular' },
          ],
        },
      })
      .addRadio({
        path: 'colorScheme',
        name: 'Color By',
        defaultValue: 'status',
        settings: {
          options: [
            { value: 'status', label: 'Status' },
            { value: 'type', label: 'Resource Type' },
            { value: 'namespace', label: 'Namespace' },
          ],
        },
      });
  });
```

## Building and Installing the Plugin

Build and install your plugin:

```bash
# Build the plugin
npm run build

# For development with hot reload
npm run dev

# Sign the plugin (required for production)
export GRAFANA_ACCESS_POLICY_TOKEN=<YOUR_ACCESS_POLICY_TOKEN>
npm run sign

# For a private plugin, include the Grafana root URL
npm run sign -- --rootUrls https://example.com/grafana

# Copy to Grafana plugins directory
sudo rm -rf /var/lib/grafana/plugins/<your-plugin-id>
sudo cp -r dist /var/lib/grafana/plugins/<your-plugin-id>

# Restart Grafana
sudo systemctl restart grafana-server
```

## Creating a Dashboard with the Topology Plugin

Configure the panel in Grafana with appropriate Prometheus queries:

```yaml
# Query for nodes
kube_node_info

# Query for pods
kube_pod_info
kube_pod_status_phase
kube_pod_owner
kube_pod_labels

# Query for services
kube_service_labels

# Query for deployments
kube_deployment_labels
```

## Conclusion

Building a custom Grafana plugin for Kubernetes topology visualization provides powerful insights into cluster structure and relationships. This interactive graph view complements traditional metric dashboards, helping you quickly understand resource dependencies, identify communication paths, and troubleshoot connectivity issues.

Start with the basic topology rendering, then enhance it with metrics overlays showing CPU/memory usage, interactive filtering, and click-through navigation to detailed resource views. The result is a comprehensive visualization tool that makes Kubernetes cluster management more intuitive and efficient.
