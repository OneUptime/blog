# Build an Azure MySQL Alert Pack with Four Independent Signals

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, MySQL, Monitoring, Reliability

Description: Build and validate separate Azure Monitor rules for MySQL CPU, connections, storage, and replica lag, with deliberate thresholds and delivery checks.

A useful database alert pack tells an operator which constraint needs attention. It should not require high CPU, a full disk, exhausted connections, and replica lag to occur simultaneously before firing.

This article builds separate Azure Monitor metric rules for four signals. The Bicep example uses the pinned `Microsoft.Insights/metricAlerts@2018-03-01` API and is intended for one existing MySQL Flexible Server per deployment. Thresholds are inputs to review, not universal production defaults.

## Choose the signal and its response

Start with this mapping:

| Signal | Metric name | Initial aggregation to evaluate | Response |
| --- | --- | --- | --- |
| CPU pressure | `cpu_percent` | Average | Inspect workload and query pressure |
| Connection occupancy | `active_connections` | Maximum | Inspect pool totals and connection headroom |
| Storage occupancy | `storage_percent` | Maximum | Review free bytes, growth rate, and capacity |
| Replica freshness | `replication_lag` | Maximum | Inspect replication status and apply progress |

These names and aggregations come from the [Azure MySQL metric reference](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-monitor-mysql-reference). Active connections include internal server connections. They are different from `total_connections`, which counts connections over an interval. Host CPU also includes Azure's server-side work, so it is not a direct measure of one application's query CPU.

Assign an owner and a first diagnostic step to each rule. A warning without a response is just another dashboard notification.

## Set thresholds from constraints

For connections, compare the observed baseline and peak with the server's effective connection limit. Leave room for administration, background activity, and overlapping application instances during deployment. A maximum pool size multiplied by the normal instance count can underestimate that overlap.

For storage, convert the threshold into remaining bytes and time at the busiest expected growth rate. A percentage alone means something different on a small server and a multi-terabyte server. Review it whenever capacity changes.

For replica lag, start with the application's tolerated staleness. Deploy that rule only to a replica. Pair it operationally with replication-status checks: missing lag samples do not mean zero lag, and Azure documents a special caveat for the SQL receiver-status field on storage-based replicas. Use the service metrics described in [replica monitoring](https://learn.microsoft.com/en-us/azure/mysql/flexible-server/concepts-read-replicas).

For CPU, compare several ordinary and busy periods before choosing the warning. The aim is enough time to investigate a developing problem without notifying someone about every brief healthy burst.

## Keep the rules independent

Multiple conditions in one metric rule are combined as an AND: all must be true to fire. Microsoft's [alert-type documentation](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-types) explains this behavior.

The template below creates three independent rules for any supplied server and adds lag when `includeReplicaLag` is true. Save it as `mysql-alerts.bicep`. It requires existing server and action-group resource IDs. An action group contains the notification destinations or actions used when an alert fires.

```bicep
param serverResourceId string
param actionGroupResourceId string
param alertPrefix string
param responseGuide string
param cpuWarningPercent int
param connectionWarningCount int
param storageWarningPercent int
param lagWarningSeconds int
param includeReplicaLag bool = false
param enableAlerts bool = false

var baseRules = [
  {
    key: 'cpu'
    metric: 'cpu_percent'
    aggregation: 'Average'
    threshold: cpuWarningPercent
  }
  {
    key: 'connections'
    metric: 'active_connections'
    aggregation: 'Maximum'
    threshold: connectionWarningCount
  }
  {
    key: 'storage'
    metric: 'storage_percent'
    aggregation: 'Maximum'
    threshold: storageWarningPercent
  }
]
var lagRules = includeReplicaLag ? [
  {
    key: 'lag'
    metric: 'replication_lag'
    aggregation: 'Maximum'
    threshold: lagWarningSeconds
  }
] : []

resource rules 'Microsoft.Insights/metricAlerts@2018-03-01' = [for rule in concat(baseRules, lagRules): {
  name: '${alertPrefix}-${rule.key}'
  location: 'global'
  properties: {
    description: '${rule.key} warning. Response: ${responseGuide}'
    severity: 2
    enabled: enableAlerts
    autoMitigate: true
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    scopes: [serverResourceId]
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'threshold'
          criterionType: 'StaticThresholdCriterion'
          metricNamespace: 'Microsoft.DBforMySQL/flexibleServers'
          metricName: rule.metric
          operator: 'GreaterThan'
          threshold: rule.threshold
          timeAggregation: rule.aggregation
          skipMetricValidation: false
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroupResourceId
      }
    ]
  }
}]
```

Each resource has one condition and one server scope. `skipMetricValidation: false` retains service-side metric validation. The resource structure follows the [pinned API reference](https://learn.microsoft.com/en-us/azure/templates/microsoft.insights/2018-03-01/metricalerts).

Choose a unique `alertPrefix` for each server in the deployment resource group. Reusing names can update existing rules rather than add a new pack. Supply a maintained runbook URL or concise response instruction in `responseGuide`. Set both percentage inputs within 0 to 100, use a positive connection count, and choose a nonnegative lag threshold.

For a nonproduction rehearsal, values such as CPU 80%, connections 160, storage 80%, and lag 60 seconds are illustrative inputs only. They are not suitable until checked against that server's capacity and workload. The lag input remains required even when its rule is omitted.

## Understand the evaluation window

The example evaluates every minute using a five-minute window. The CPU rule compares the window's average with its threshold. Maximum-based rules can fire from a peak within that window; they do not require every sample for five minutes to exceed the threshold.

`autoMitigate: true` enables automatic resolution. Stateful alerts do not keep sending a new notification on every evaluation while the same condition remains fired. Resolution also has its own evaluation behavior; it is not identical to a person acknowledging the incident. See [Azure Monitor alert state](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/alerts-overview).

Adjust the window and aggregation deliberately after reviewing representative charts. Do not describe this example as “five consecutive minutes above threshold,” because that is not what it implements.

## Compile, review, then enable

The complete template was compiled locally with [Bicep CLI 0.49.2](https://github.com/Azure/bicep/releases/tag/v0.49.2). With that standalone CLI installed, run:

```bash
bicep build mysql-alerts.bicep --outfile mysql-alerts.json
```

This writes an Azure Resource Manager JSON template. The [Bicep CLI documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/bicep-cli) explains the build command. Compilation checks the template locally; it does not confirm resource IDs, permissions, available metrics, or successful Azure deployment.

Review the compiled template and parameters through your normal infrastructure change process. Deploy first to a nonproduction server with `enableAlerts=false`, confirm the rule scope and action group, then enable the rehearsal rules. This template creates alert resources; it does not create or resize the database.

## Test delivery and detection separately

Test the action group's notification path and confirm receipt with the responsible team, following the [action-group testing procedure](https://learn.microsoft.com/en-us/azure/azure-monitor/alerts/action-groups). That checks delivery, not the metric condition.

For detection testing, use a temporary nonproduction rule with a threshold safely below an already observed metric value. Verify its fired state, associated notification, and eventual resolution after restoring the reviewed threshold. Record the temporary setting and restore it immediately after the exercise.

Do not fill a disk, exhaust production connections, or intentionally create serious replica lag just to test this pack. When the test finishes, compare the deployed rule configuration with the reviewed parameters and remove any temporary duplicate rules.

Keep application error and availability checks alongside these capacity signals. A database can be within all four thresholds while a query, permission, or network problem still breaks the application. The pack is useful when it gives a clear early warning and a tested route to an owner, while acknowledging what it does not measure.
