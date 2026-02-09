# How to Set Up Alertmanager Inhibition Rules to Suppress Cascading Kubernetes Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alertmanager, Kubernetes, Alerts, Inhibition, Observability

Description: Learn how to configure Alertmanager inhibition rules to automatically suppress cascading alerts in Kubernetes and reduce alert noise from infrastructure failures.

---

When a node fails in Kubernetes, dozens of related alerts fire: pods not ready, containers crashed, endpoints unavailable. These cascading alerts bury the root cause under noise. Alertmanager inhibition rules automatically suppress dependent alerts when parent infrastructure alerts fire.

This guide covers designing inhibition rules that prevent alert storms while preserving visibility into actual issues.

## Understanding Alert Inhibition

Inhibition suppresses target alerts when source alerts are firing. For example, if a NodeDown alert fires, inhibit all PodNotReady alerts on that node since they're consequences of the node failure.

Inhibition requires:

1. **Source matcher**: Identifies the parent alert (e.g., NodeDown)
2. **Target matcher**: Identifies alerts to suppress (e.g., PodNotReady)
3. **Equal labels**: Labels that must match between source and target (e.g., node)

When the source alert resolves, inhibited alerts immediately become active again if they're still firing.

## Basic Node-to-Pod Inhibition

Suppress pod alerts when their node is down:

```yaml
inhibit_rules:
# Inhibit pod alerts when node is down
- source_match:
    alertname: NodeDown
  target_match_re:
    alertname: 'PodNotReady|PodCrashLooping|ContainerRestart'
  equal:
    - node
```

This prevents alerting on pod issues that are caused by node failures.

## Cluster-Level Inhibition

Suppress namespace-level alerts when entire cluster is unhealthy:

```yaml
inhibit_rules:
# Inhibit all namespace alerts when cluster API is down
- source_match:
    alertname: KubernetesAPIDown
  target_match_re:
    severity: 'warning|info'
  equal:
    - cluster

# Inhibit namespace alerts when cluster has no healthy nodes
- source_match:
    alertname: NoHealthyNodes
  target_match_re:
    namespace: '.*'
  equal:
    - cluster
```

When fundamental cluster components fail, suppress the flood of resulting alerts.

## Severity-Based Inhibition

Critical alerts suppress warnings for the same component:

```yaml
inhibit_rules:
# Critical alerts suppress warnings for same service
- source_match:
    severity: critical
  target_match:
    severity: warning
  equal:
    - namespace
    - alertname

# Critical errors suppress info alerts
- source_match:
    severity: critical
  target_match:
    severity: info
  equal:
    - namespace
    - service
```

This ensures teams focus on critical issues first.

## Network Inhibition Rules

Suppress service alerts when ingress or network is down:

```yaml
inhibit_rules:
# Inhibit service endpoint alerts when ingress controller is down
- source_match:
    alertname: IngressControllerDown
  target_match_re:
    alertname: 'ServiceUnavailable|EndpointDown|HTTPProbeFailure'
  equal:
    - cluster

# Inhibit inter-pod network alerts when CNI is failing
- source_match:
    alertname: CNIPluginFailed
  target_match_re:
    alertname: '.*Network.*|.*Connection.*'
  equal:
    - cluster
```

## Database Inhibition Rules

Suppress application alerts when database is down:

```yaml
inhibit_rules:
# Inhibit app errors when database is down
- source_match:
    alertname: DatabaseDown
  target_match_re:
    alertname: 'HighErrorRate|SlowResponses|APIFailure'
  equal:
    - namespace

# Inhibit read replica alerts when primary is down
- source_match:
    alertname: PostgresPrimaryDown
  target_match:
    alertname: PostgresReplicaLag
  equal:
    - cluster
    - database_cluster
```

## Storage Inhibition Rules

Suppress pod alerts when persistent volumes have issues:

```yaml
inhibit_rules:
# Inhibit pod alerts when PV is unavailable
- source_match:
    alertname: PersistentVolumeUnavailable
  target_match_re:
    alertname: 'PodNotReady|PodCrashLooping'
  equal:
    - namespace
    - persistentvolumeclaim

# Inhibit app alerts when disk is full
- source_match:
    alertname: DiskFull
  target_match_re:
    alertname: '.*Error.*|.*Failed.*'
  equal:
    - node
```

## Deployment Inhibition

Suppress alerts during active deployments:

```yaml
inhibit_rules:
# Inhibit pod restart alerts during rollout
- source_match:
    alertname: RolloutInProgress
  target_match_re:
    alertname: 'PodRestart|PodCrashLooping'
  equal:
    - namespace
    - deployment

# Inhibit availability alerts during scheduled rollout
- source_match:
    alertname: ScheduledDeployment
  target_match:
    severity: warning
  equal:
    - namespace
```

Combine with annotations to automatically create these alerts during deployments.

## Complete Inhibition Configuration

Here's a comprehensive inhibition ruleset for Kubernetes:

```yaml
inhibit_rules:
# Cluster-level inhibitions
- source_match:
    alertname: KubernetesAPIDown
  target_match_re:
    severity: 'warning|info'
  equal:
    - cluster

- source_match:
    alertname: KubeletDown
  target_match_re:
    alertname: 'NodeNotReady|NodeMemoryPressure|NodeDiskPressure'
  equal:
    - node

# Node-level inhibitions
- source_match:
    alertname: NodeDown
  target_match_re:
    alertname: '.*'
  equal:
    - node

- source_match:
    alertname: NodeNotReady
  target_match_re:
    alertname: 'PodNotReady|PodCrashLooping|ContainerRestart'
  equal:
    - node

- source_match:
    alertname: NodeDiskFull
  target_match_re:
    alertname: 'PodEvicted|PodCrashLooping'
  equal:
    - node

# Network inhibitions
- source_match:
    alertname: IngressControllerDown
  target_match_re:
    alertname: 'HTTPProbeFailure|ServiceUnavailable|EndpointDown'
  equal:
    - cluster

- source_match:
    alertname: DNSFailure
  target_match_re:
    alertname: 'ServiceDiscoveryFailed|EndpointNotFound'
  equal:
    - cluster

# Storage inhibitions
- source_match:
    alertname: PersistentVolumeUnavailable
  target_match_re:
    alertname: 'PodNotReady|PodCrashLooping'
  equal:
    - namespace
    - persistentvolumeclaim

- source_match:
    alertname: StorageClassUnavailable
  target_match:
    alertname: PVCPendingBinding
  equal:
    - cluster
    - storageclass

# Database inhibitions
- source_match:
    alertname: DatabaseDown
  target_match_re:
    alertname: 'HighErrorRate|SlowAPIResponse|ConnectionPoolExhausted'
  equal:
    - namespace

- source_match:
    alertname: PostgresPrimaryDown
  target_match_re:
    alertname: 'PostgresReplicaLag|PostgresReplicationBroken'
  equal:
    - database_cluster

# Severity-based inhibitions
- source_match:
    severity: critical
  target_match:
    severity: warning
  equal:
    - namespace
    - alertname

- source_match:
    severity: critical
  target_match:
    severity: info
  equal:
    - namespace
    - service

# Deployment inhibitions
- source_match:
    alertname: RollingUpdateInProgress
  target_match_re:
    alertname: 'PodRestart|ContainerRestart'
    severity: warning
  equal:
    - namespace
    - deployment

# Maintenance window inhibitions
- source_match:
    alertname: MaintenanceMode
  target_match_re:
    severity: 'warning|info'
  equal:
    - namespace
```

## Testing Inhibition Rules

Verify inhibition works correctly:

```bash
# Fire source alert (simulate node down)
curl -X POST http://alertmanager:9093/api/v2/alerts <<EOF
[{
  "labels": {
    "alertname": "NodeDown",
    "node": "worker-01",
    "severity": "critical"
  },
  "annotations": {
    "summary": "Node worker-01 is down"
  }
}]
EOF

# Fire target alert (pod not ready on same node)
curl -X POST http://alertmanager:9093/api/v2/alerts <<EOF
[{
  "labels": {
    "alertname": "PodNotReady",
    "node": "worker-01",
    "pod": "myapp-abc123",
    "severity": "warning"
  },
  "annotations": {
    "summary": "Pod myapp-abc123 not ready"
  }
}]
EOF

# Check Alertmanager UI - PodNotReady should be inhibited
```

## Monitoring Inhibition Effectiveness

Track inhibited alerts:

```promql
# Number of inhibited alerts
alertmanager_alerts{state="suppressed"}

# Alerts by inhibition rule
sum by (alertname) (
  alertmanager_alerts{state="suppressed"}
)
```

Create dashboards showing:

- Active vs inhibited alert counts
- Most frequently inhibited alert types
- Inhibition rule effectiveness

## Avoiding Over-Inhibition

Be careful not to suppress alerts that indicate independent issues:

```yaml
# Bad - too broad
- source_match:
    severity: critical
  target_match_re:
    alertname: '.*'  # Suppresses everything!

# Good - specific
- source_match:
    alertname: NodeDown
  target_match_re:
    alertname: 'PodNotReady|PodCrashLooping'
  equal:
    - node
```

Always require equal labels to ensure source and target are actually related.

## Combining Inhibition with Routing

Use inhibition with routing to reduce noise:

```yaml
route:
  routes:
  # Route critical alerts immediately
  - match:
      severity: critical
    receiver: oncall

  # Route warnings with grouping to reduce noise
  - match:
      severity: warning
    receiver: slack
    group_wait: 30s
    group_interval: 5m

inhibit_rules:
# Critical alerts suppress warnings
- source_match:
    severity: critical
  target_match:
    severity: warning
  equal:
    - namespace
    - service
```

## Dynamic Inhibition with Custom Alerts

Create custom alerts that trigger inhibition:

```yaml
# Alert rule that triggers inhibition
groups:
- name: infrastructure
  rules:
  - alert: ClusterUnderMaintenance
    expr: kube_node_spec_unschedulable > 3
    labels:
      severity: info
      inhibit: "true"
    annotations:
      summary: "Cluster maintenance in progress"

# Inhibition rule
inhibit_rules:
- source_match:
    alertname: ClusterUnderMaintenance
  target_match:
    severity: warning
  equal:
    - cluster
```

## Debugging Inhibition Issues

If alerts aren't being inhibited:

1. Check label matching with amtool:

```bash
amtool config routes test \
  --config.file=alertmanager.yml \
  --tree \
  alertname=PodNotReady \
  node=worker-01
```

2. Verify equal labels exist on both alerts
3. Check Alertmanager logs for inhibition decisions
4. Use Alertmanager UI to see inhibition status

Well-designed inhibition rules dramatically reduce alert noise by automatically suppressing cascading failures while preserving root cause visibility.
