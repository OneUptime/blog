# How to Implement Dashboards as Code with Grafonnet for Kubernetes Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafonnet, Grafana, Dashboards, Infrastructure as Code, Kubernetes

Description: Learn how to create maintainable Grafana dashboards using Grafonnet (Jsonnet library) to define dashboards as code with version control and reusability.

---

Manually creating Grafana dashboards through the UI becomes unmaintainable as dashboards proliferate. Grafonnet enables defining dashboards as code using Jsonnet, providing version control, code reuse, and programmatic dashboard generation.

This guide covers using Grafonnet to create Kubernetes monitoring dashboards as code.

## Understanding Grafonnet

Grafonnet is a Jsonnet library that generates Grafana dashboard JSON. Jsonnet is a data templating language that extends JSON with variables, functions, and logic.

Benefits of dashboards as code:

- Version control with Git
- Code review for dashboard changes
- Reusable dashboard components
- Programmatic dashboard generation
- Consistent styling across dashboards
- Easy bulk updates

## Installing Jsonnet and Grafonnet

Install the Jsonnet compiler and Grafonnet library:

```bash
# Install jsonnet
brew install jsonnet  # macOS
# Or download from https://github.com/google/jsonnet/releases

# Clone Grafonnet
git clone https://github.com/grafana/grafonnet-lib.git
export JSONNET_PATH="$(pwd)/grafonnet-lib"
```

## Creating Your First Dashboard

Create a basic dashboard in Grafonnet:

```jsonnet
// dashboard.jsonnet
local grafana = import 'grafonnet/grafana.libsonnet';
local dashboard = grafana.dashboard;
local graphPanel = grafana.graphPanel;
local prometheus = grafana.prometheus;

dashboard.new(
  'Kubernetes Cluster Overview',
  schemaVersion=16,
  tags=['kubernetes', 'cluster'],
  time_from='now-6h',
  refresh='30s',
)
.addPanel(
  graphPanel.new(
    'CPU Usage',
    datasource='Prometheus',
    span=6,
  )
  .addTarget(
    prometheus.target(
      'sum(rate(container_cpu_usage_seconds_total{container!=""}[5m]))',
      legendFormat='CPU Cores',
    )
  ),
  gridPos={h: 8, w: 12, x: 0, y: 0}
)
.addPanel(
  graphPanel.new(
    'Memory Usage',
    datasource='Prometheus',
    span=6,
  )
  .addTarget(
    prometheus.target(
      'sum(container_memory_working_set_bytes{container!=""}) / 1024 / 1024 / 1024',
      legendFormat='Memory (GB)',
    )
  ),
  gridPos={h: 8, w: 12, x: 12, y: 0}
)
```

Compile to JSON:

```bash
jsonnet -J grafonnet-lib dashboard.jsonnet > dashboard.json
```

## Creating Reusable Panel Templates

Define reusable panel functions:

```jsonnet
local grafana = import 'grafonnet/grafana.libsonnet';
local graphPanel = grafana.graphPanel;
local prometheus = grafana.prometheus;

{
  // Reusable CPU panel function
  cpuPanel(title, query, legendFormat)::
    graphPanel.new(
      title,
      datasource='Prometheus',
      format='percentunit',
      min=0,
      max=1,
    )
    .addTarget(
      prometheus.target(
        query,
        legendFormat=legendFormat,
      )
    ),

  // Reusable memory panel function
  memoryPanel(title, query, legendFormat)::
    graphPanel.new(
      title,
      datasource='Prometheus',
      format='bytes',
    )
    .addTarget(
      prometheus.target(
        query,
        legendFormat=legendFormat,
      )
    ),
}
```

Use templates in dashboards:

```jsonnet
local panels = import 'panels.libsonnet';

dashboard.new('Namespace Metrics')
.addPanel(
  panels.cpuPanel(
    'Namespace CPU Usage',
    'sum by (namespace) (rate(container_cpu_usage_seconds_total[5m]))',
    '{{namespace}}'
  ),
  gridPos={h: 8, w: 12, x: 0, y: 0}
)
```

## Creating Dashboard Variables

Add template variables to dashboards:

```jsonnet
local template = grafana.template;

dashboard.new('Per-Namespace Dashboard')
.addTemplate(
  template.new(
    'namespace',
    'Prometheus',
    'label_values(kube_namespace_status_phase, namespace)',
    label='Namespace',
    refresh='time',
    multi=true,
    includeAll=true,
  )
)
.addTemplate(
  template.new(
    'pod',
    'Prometheus',
    'label_values(kube_pod_info{namespace="$namespace"}, pod)',
    label='Pod',
    refresh='time',
    multi=true,
  )
)
```

Reference variables in queries:

```jsonnet
.addTarget(
  prometheus.target(
    'rate(container_cpu_usage_seconds_total{namespace="$namespace", pod="$pod"}[5m])',
    legendFormat='{{pod}}',
  )
)
```

## Building Complete Kubernetes Dashboard

Here's a production-ready Kubernetes dashboard:

```jsonnet
local grafana = import 'grafonnet/grafana.libsonnet';
local dashboard = grafana.dashboard;
local row = grafana.row;
local graphPanel = grafana.graphPanel;
local statPanel = grafana.statPanel;
local prometheus = grafana.prometheus;
local template = grafana.template;

local namespace = template.new(
  'namespace',
  'Prometheus',
  'label_values(kube_namespace_status_phase{phase="Active"}, namespace)',
  label='Namespace',
  refresh='time',
  sort=1,
);

local cpuPanel = graphPanel.new(
  'CPU Usage',
  datasource='Prometheus',
  format='short',
  legend_show=true,
  legend_values=true,
  legend_current=true,
  legend_alignAsTable=true,
)
.addTarget(
  prometheus.target(
    'sum by (namespace) (rate(container_cpu_usage_seconds_total{namespace="$namespace", container!=""}[5m]))',
    legendFormat='{{namespace}}',
  )
);

local memoryPanel = graphPanel.new(
  'Memory Usage',
  datasource='Prometheus',
  format='bytes',
  legend_show=true,
)
.addTarget(
  prometheus.target(
    'sum by (namespace) (container_memory_working_set_bytes{namespace="$namespace", container!=""})',
    legendFormat='{{namespace}}',
  )
);

local podCountStat = statPanel.new(
  'Running Pods',
  datasource='Prometheus',
  reducerFunction='lastNotNull',
  graphMode='none',
  colorMode='value',
)
.addTarget(
  prometheus.target(
    'count(kube_pod_status_phase{namespace="$namespace", phase="Running"})',
  )
)
.addThreshold({color: 'red', value: 0})
.addThreshold({color: 'green', value: 1});

dashboard.new(
  'Kubernetes Namespace Monitoring',
  tags=['kubernetes', 'namespace'],
  schemaVersion=16,
  refresh='30s',
  time_from='now-1h',
  editable=true,
)
.addTemplate(namespace)
.addRow(
  row.new(title='Resource Usage')
  .addPanel(cpuPanel, gridPos={h: 8, w: 12, x: 0, y: 0})
  .addPanel(memoryPanel, gridPos={h: 8, w: 12, x: 12, y: 0})
)
.addRow(
  row.new(title='Pod Statistics')
  .addPanel(podCountStat, gridPos={h: 4, w: 6, x: 0, y: 8})
)
```

## Creating Panel Libraries

Organize common panels into libraries:

```jsonnet
// kubernetes-panels.libsonnet
local grafana = import 'grafonnet/grafana.libsonnet';
local graphPanel = grafana.graphPanel;
local prometheus = grafana.prometheus;

{
  cpuUsageByNamespace::
    graphPanel.new(
      'CPU Usage by Namespace',
      datasource='Prometheus',
      format='short',
    )
    .addTarget(
      prometheus.target(
        'sum by (namespace) (rate(container_cpu_usage_seconds_total{container!=""}[5m]))',
        legendFormat='{{namespace}}',
      )
    ),

  memoryUsageByNamespace::
    graphPanel.new(
      'Memory Usage by Namespace',
      datasource='Prometheus',
      format='bytes',
    )
    .addTarget(
      prometheus.target(
        'sum by (namespace) (container_memory_working_set_bytes{container!=""})',
        legendFormat='{{namespace}}',
      )
    ),

  networkThroughput::
    graphPanel.new(
      'Network Throughput',
      datasource='Prometheus',
      format='Bps',
    )
    .addTarget(
      prometheus.target(
        'sum(rate(container_network_receive_bytes_total[5m]))',
        legendFormat='Receive',
      )
    )
    .addTarget(
      prometheus.target(
        'sum(rate(container_network_transmit_bytes_total[5m]))',
        legendFormat='Transmit',
      )
    ),
}
```

Import and use:

```jsonnet
local k8s = import 'kubernetes-panels.libsonnet';

dashboard.new('Cluster Overview')
.addPanel(k8s.cpuUsageByNamespace, gridPos={h: 8, w: 12, x: 0, y: 0})
.addPanel(k8s.memoryUsageByNamespace, gridPos={h: 8, w: 12, x: 12, y: 0})
.addPanel(k8s.networkThroughput, gridPos={h: 8, w: 24, x: 0, y: 8})
```

## Programmatic Dashboard Generation

Generate multiple dashboards from configuration:

```jsonnet
local grafana = import 'grafonnet/grafana.libsonnet';
local dashboard = grafana.dashboard;

local namespaces = ['production', 'staging', 'development'];

{
  ['namespace-' + ns + '.json']:
    dashboard.new(
      'Namespace: ' + ns,
      tags=['kubernetes', ns],
    )
    // Add panels specific to namespace
  for ns in namespaces
}
```

Compile all dashboards:

```bash
jsonnet -J grafonnet-lib -m dashboards/ multi-dashboard.jsonnet
```

## Adding Alerts to Panels

Include alert rules in panels:

```jsonnet
graphPanel.new(
  'CPU Usage',
  datasource='Prometheus',
)
.addTarget(
  prometheus.target(
    'sum(rate(container_cpu_usage_seconds_total[5m]))',
  )
)
.addAlert(
  'High CPU Usage',
  executionErrorState='alerting',
  frequency='1m',
  notifications=[
    {id: 1, uid: 'slack-channel'},
  ],
)
.addCondition({
  type: 'query',
  query: {params: ['A', '5m', 'now']},
  reducer: {type: 'avg', params: []},
  evaluator: {type: 'gt', params: [0.8]},
})
```

## Versioning and CI/CD Integration

Store dashboards in Git and automate deployment:

```yaml
# .gitlab-ci.yml
compile-dashboards:
  stage: build
  image: bitnami/jsonnet:latest
  script:
    - jsonnet -J grafonnet-lib -m dashboards/ src/*.jsonnet
  artifacts:
    paths:
      - dashboards/

deploy-dashboards:
  stage: deploy
  image: curlimages/curl:latest
  script:
    - |
      for dashboard in dashboards/*.json; do
        curl -X POST \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $GRAFANA_API_KEY" \
          -d @$dashboard \
          http://grafana.monitoring.svc.cluster.local:3000/api/dashboards/db
      done
```

## Testing Dashboards

Validate generated JSON:

```bash
# Check JSON is valid
jsonnet dashboard.jsonnet | jq empty

# Lint Jsonnet code
jsonnetfmt --test dashboard.jsonnet

# Format code
jsonnetfmt -i dashboard.jsonnet
```

## Deploying with Kubernetes ConfigMaps

Deploy dashboards via ConfigMaps:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: grafana-dashboards
  namespace: monitoring
  labels:
    grafana_dashboard: "1"
data:
  kubernetes-overview.json: |-
    {{ include "dashboards/kubernetes-overview.json" }}
```

Use Grafana dashboard provisioning to load automatically.

Grafonnet transforms dashboard management from manual UI work into version-controlled, testable, reusable code that scales across hundreds of dashboards.
