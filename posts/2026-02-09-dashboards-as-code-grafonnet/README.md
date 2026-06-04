# How to Implement Dashboards as Code with Grafonnet for Kubernetes Monitoring

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Grafonnet, Grafana, Dashboard, Infrastructure as Code, Kubernetes

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
# Install go-jsonnet and jsonnet-bundler on macOS
brew install go-jsonnet jsonnet-bundler

# Install Grafonnet
jb init
jb install github.com/grafana/grafonnet/gen/grafonnet-latest@main

# Optional portable import file
echo "import 'github.com/grafana/grafonnet/gen/grafonnet-latest/main.libsonnet'" > g.libsonnet
```

## Creating Your First Dashboard

Create a basic dashboard in Grafonnet:

```jsonnet
// dashboard.jsonnet
local g = import 'g.libsonnet';

local prometheus = g.query.prometheus;
local timeSeries = g.panel.timeSeries;

g.dashboard.new('Kubernetes Cluster Overview')
+ g.dashboard.withSchemaVersion(39)
+ g.dashboard.withTags(['kubernetes', 'cluster'])
+ g.dashboard.time.withFrom('now-6h')
+ g.dashboard.withRefresh('30s')
+ g.dashboard.withPanels([
  timeSeries.new('CPU Usage')
  + timeSeries.queryOptions.withTargets([
    prometheus.new(
      'prometheus',
      'sum(rate(container_cpu_usage_seconds_total{container!=""}[5m]))'
    )
    + prometheus.withLegendFormat('CPU Cores'),
  ])
  + timeSeries.standardOptions.withUnit('short')
  + timeSeries.panelOptions.withGridPos(h=8, w=12, x=0, y=0),

  timeSeries.new('Memory Usage')
  + timeSeries.queryOptions.withTargets([
    prometheus.new(
      'prometheus',
      'sum(container_memory_working_set_bytes{container!=""})'
    )
    + prometheus.withLegendFormat('Memory'),
  ])
  + timeSeries.standardOptions.withUnit('bytes')
  + timeSeries.panelOptions.withGridPos(h=8, w=12, x=12, y=0),
])
```

Compile to JSON:

```bash
jsonnet -J vendor dashboard.jsonnet > dashboard.json
```

## Creating Reusable Panel Templates

Define reusable panel functions:

```jsonnet
local g = import 'g.libsonnet';
local prometheus = g.query.prometheus;
local timeSeries = g.panel.timeSeries;

{
  // Reusable CPU panel function
  cpuPanel(title, query, legendFormat)::
    timeSeries.new(title)
    + timeSeries.queryOptions.withTargets([
      prometheus.new('prometheus', query)
      + prometheus.withLegendFormat(legendFormat),
    ])
    + timeSeries.standardOptions.withUnit('percentunit')
    + timeSeries.standardOptions.withMin(0)
    + timeSeries.standardOptions.withMax(1),

  // Reusable memory panel function
  memoryPanel(title, query, legendFormat)::
    timeSeries.new(title)
    + timeSeries.queryOptions.withTargets([
      prometheus.new('prometheus', query)
      + prometheus.withLegendFormat(legendFormat),
    ])
    + timeSeries.standardOptions.withUnit('bytes'),
}
```

Use templates in dashboards:

```jsonnet
local g = import 'g.libsonnet';
local panels = import 'panels.libsonnet';

g.dashboard.new('Namespace Metrics')
+ g.dashboard.withPanels([
  panels.cpuPanel(
    'Namespace CPU Usage',
    'sum by (namespace) (rate(container_cpu_usage_seconds_total[5m]))',
    '{{namespace}}'
  )
  + g.panel.timeSeries.panelOptions.withGridPos(h=8, w=12, x=0, y=0),
])
```

## Creating Dashboard Variables

Add template variables to dashboards:

```jsonnet
local g = import 'g.libsonnet';
local var = g.dashboard.variable;

g.dashboard.new('Per-Namespace Dashboard')
+ g.dashboard.withVariables([
  var.query.new('namespace')
  + var.query.withDatasource(type='prometheus', uid='prometheus')
  + var.query.queryTypes.withLabelValues('namespace', 'kube_namespace_status_phase')
  + var.query.generalOptions.withLabel('Namespace')
  + var.query.refresh.onTime()
  + var.query.selectionOptions.withMulti()
  + var.query.selectionOptions.withIncludeAll(),

  var.query.new('pod')
  + var.query.withDatasource(type='prometheus', uid='prometheus')
  + var.query.queryTypes.withLabelValues('pod', 'kube_pod_info{namespace=~"$namespace"}')
  + var.query.generalOptions.withLabel('Pod')
  + var.query.refresh.onTime()
  + var.query.selectionOptions.withMulti(),
])
```

Reference variables in queries:

```jsonnet
local g = import 'g.libsonnet';
local prometheus = g.query.prometheus;
local timeSeries = g.panel.timeSeries;

timeSeries.queryOptions.withTargets([
  prometheus.new(
    'prometheus',
    'rate(container_cpu_usage_seconds_total{namespace=~"$namespace", pod=~"$pod"}[5m])'
  )
  + prometheus.withLegendFormat('{{pod}}'),
])
```

## Building Complete Kubernetes Dashboard

Here's a complete Kubernetes dashboard:

```jsonnet
local g = import 'g.libsonnet';
local prometheus = g.query.prometheus;
local row = g.panel.row;
local stat = g.panel.stat;
local timeSeries = g.panel.timeSeries;
local var = g.dashboard.variable;

local namespace =
  var.query.new('namespace')
  + var.query.withDatasource(type='prometheus', uid='prometheus')
  + var.query.queryTypes.withLabelValues('namespace', 'kube_namespace_status_phase{phase="Active"}')
  + var.query.generalOptions.withLabel('Namespace')
  + var.query.refresh.onTime()
  + var.query.withSort(1);

local cpuPanel =
  timeSeries.new('CPU Usage')
  + timeSeries.queryOptions.withTargets([
    prometheus.new(
      'prometheus',
      'sum by (namespace) (rate(container_cpu_usage_seconds_total{namespace=~"$namespace", container!=""}[5m]))'
    )
    + prometheus.withLegendFormat('{{namespace}}'),
  ])
  + timeSeries.standardOptions.withUnit('short')
  + timeSeries.options.legend.withDisplayMode('table')
  + timeSeries.options.legend.withCalcs(['lastNotNull', 'max']);

local memoryPanel =
  timeSeries.new('Memory Usage')
  + timeSeries.queryOptions.withTargets([
    prometheus.new(
      'prometheus',
      'sum by (namespace) (container_memory_working_set_bytes{namespace=~"$namespace", container!=""})'
    )
    + prometheus.withLegendFormat('{{namespace}}'),
  ])
  + timeSeries.standardOptions.withUnit('bytes')
  + timeSeries.options.legend.withDisplayMode('table');

local podCountStat =
  stat.new('Running Pods')
  + stat.queryOptions.withTargets([
    prometheus.new(
      'prometheus',
      'count(kube_pod_status_phase{namespace=~"$namespace", phase="Running"})'
    ),
  ])
  + stat.options.reduceOptions.withCalcs(['lastNotNull'])
  + stat.options.withGraphMode('none')
  + stat.options.withColorMode('value')
  + stat.standardOptions.thresholds.withSteps([
    {color: 'red', value: null},
    {color: 'green', value: 1},
  ]);

g.dashboard.new('Kubernetes Namespace Monitoring')
+ g.dashboard.withTags(['kubernetes', 'namespace'])
+ g.dashboard.withSchemaVersion(39)
+ g.dashboard.withRefresh('30s')
+ g.dashboard.time.withFrom('now-1h')
+ g.dashboard.withEditable()
+ g.dashboard.withVariables([namespace])
+ g.dashboard.withPanels(
  g.util.grid.makeGrid([
    row.new('Resource Usage')
    + row.withPanels([cpuPanel, memoryPanel]),

    row.new('Pod Statistics')
    + row.withPanels([podCountStat]),
  ], panelWidth=12)
)
```

## Creating Panel Libraries

Organize common panels into libraries:

```jsonnet
// kubernetes-panels.libsonnet
local g = import 'g.libsonnet';
local prometheus = g.query.prometheus;
local timeSeries = g.panel.timeSeries;

{
  cpuUsageByNamespace::
    timeSeries.new('CPU Usage by Namespace')
    + timeSeries.queryOptions.withTargets([
      prometheus.new(
        'prometheus',
        'sum by (namespace) (rate(container_cpu_usage_seconds_total{container!=""}[5m]))'
      )
      + prometheus.withLegendFormat('{{namespace}}'),
    ])
    + timeSeries.standardOptions.withUnit('short'),

  memoryUsageByNamespace::
    timeSeries.new('Memory Usage by Namespace')
    + timeSeries.queryOptions.withTargets([
      prometheus.new(
        'prometheus',
        'sum by (namespace) (container_memory_working_set_bytes{container!=""})'
      )
      + prometheus.withLegendFormat('{{namespace}}'),
    ])
    + timeSeries.standardOptions.withUnit('bytes'),

  networkThroughput::
    timeSeries.new('Network Throughput')
    + timeSeries.queryOptions.withTargets([
      prometheus.new(
        'prometheus',
        'sum(rate(container_network_receive_bytes_total[5m]))'
      )
      + prometheus.withLegendFormat('Receive'),
      prometheus.new(
        'prometheus',
        'sum(rate(container_network_transmit_bytes_total[5m]))'
      )
      + prometheus.withLegendFormat('Transmit'),
    ])
    + timeSeries.standardOptions.withUnit('Bps'),
}
```

Import and use:

```jsonnet
local g = import 'g.libsonnet';
local k8s = import 'kubernetes-panels.libsonnet';

g.dashboard.new('Cluster Overview')
+ g.dashboard.withPanels([
  k8s.cpuUsageByNamespace + g.panel.timeSeries.panelOptions.withGridPos(h=8, w=12, x=0, y=0),
  k8s.memoryUsageByNamespace + g.panel.timeSeries.panelOptions.withGridPos(h=8, w=12, x=12, y=0),
  k8s.networkThroughput + g.panel.timeSeries.panelOptions.withGridPos(h=8, w=24, x=0, y=8),
])
```

## Programmatic Dashboard Generation

Generate multiple dashboards from configuration:

```jsonnet
local g = import 'g.libsonnet';

local namespaces = ['production', 'staging', 'development'];

{
  ['namespace-' + ns + '.json']:
    g.dashboard.new('Namespace: ' + ns)
    + g.dashboard.withTags(['kubernetes', ns])
    // Add panels specific to namespace
  for ns in namespaces
}
```

Compile all dashboards:

```bash
jsonnet -J vendor -m dashboards/ multi-dashboard.jsonnet
```

## Adding Alerts

Use Grafana-managed alert rules instead of legacy dashboard alerts:

```jsonnet
local g = import 'g.libsonnet';
local ruleGroup = g.alerting.ruleGroup;
local rule = ruleGroup.rule;
local data = rule.data;

ruleGroup.withName('Kubernetes alerts')
+ ruleGroup.withFolderUid('monitoring')
+ ruleGroup.withInterval(60)
+ ruleGroup.withRules([
  rule.withName('High CPU Usage')
  + rule.withCondition('B')
  + rule.withFor('5m')
  + rule.withNoDataState('OK')
  + rule.withExecErrState('Error')
  + rule.withData([
    data.withRefId('A')
    + data.withDatasourceUid('prometheus')
    + data.relativeTimeRange.withFrom(300)
    + data.relativeTimeRange.withTo(0)
    + data.withModel({
      refId: 'A',
      expr: 'sum(rate(container_cpu_usage_seconds_total[5m]))',
      datasource: {type: 'prometheus', uid: 'prometheus'},
    }),
    data.withRefId('B')
    + data.withDatasourceUid('__expr__')
    + data.relativeTimeRange.withFrom(0)
    + data.relativeTimeRange.withTo(0)
    + data.withModel({
      refId: 'B',
      type: 'threshold',
      expression: 'A',
      conditions: [{
        evaluator: {type: 'gt', params: [0.8]},
        reducer: {type: 'avg', params: []},
        type: 'query',
      }],
      datasource: {type: '__expr__', uid: '__expr__'},
    }),
  ]),
])
```

## Versioning and CI/CD Integration

Store dashboards in Git and automate deployment:

```yaml
# .gitlab-ci.yml
compile-dashboards:
  stage: build
  image: bitnami/jsonnet:latest
  script:
    - jsonnet -J vendor -m dashboards/ src/*.jsonnet
  artifacts:
    paths:
      - dashboards/

deploy-dashboards:
  stage: deploy
  image: alpine:3.20
  script:
    - apk add --no-cache curl jq
    - |
      for dashboard in dashboards/*.json; do
        jq -n --argfile dashboard "$dashboard" \
          '{dashboard: $dashboard, overwrite: true}' > payload.json
        curl -X POST \
          -H "Content-Type: application/json" \
          -H "Authorization: Bearer $GRAFANA_API_KEY" \
          -d @payload.json \
          http://grafana.monitoring.svc.cluster.local:3000/api/dashboards/db
      done
```

## Testing Dashboards

Validate generated JSON:

```bash
# Check JSON is valid
jsonnet -J vendor dashboard.jsonnet | jq empty

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
    {
      "title": "Kubernetes Overview",
      "schemaVersion": 39,
      "panels": []
    }
```

Use Grafana dashboard provisioning, or a sidecar configured to watch labeled ConfigMaps, to load the files automatically.

Grafonnet transforms dashboard management from manual UI work into version-controlled, testable, reusable code that scales across hundreds of dashboards.
