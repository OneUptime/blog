# Set Up Alertmanager Inhibition Rules to Suppress Cascading Kubernetes Alerts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Alertmanager, Kubernetes, Alert, Inhibition, Observability

Description: Learn how to configure Alertmanager inhibition rules to automatically suppress cascading alerts in Kubernetes and reduce alert noise from infrastructure failures.

---

When a node fails in Kubernetes, dozens of related alerts fire: pods not ready, containers crashed, endpoints unavailable. These cascading alerts bury the root cause under noise. Alertmanager inhibition rules automatically suppress dependent alerts when parent infrastructure alerts fire.

This guide covers designing inhibition rules that prevent alert storms while preserving visibility into actual issues.

## Understanding Alert Inhibition

Inhibition suppresses target alerts when source alerts are firing. For example, if a NodeDown alert fires, inhibit all PodNotReady alerts on that node since they're consequences of the node failure.

Inhibition usually includes:

1. **Source matcher**: Identifies the parent alert (e.g., NodeDown)
2. **Target matcher**: Identifies alerts to suppress (e.g., PodNotReady)
3. **Equal labels**: Labels that must match between source and target (e.g., node)

When the source alert resolves, inhibited alerts are no longer suppressed if they're still firing and can notify according to the route's timing settings.

## Basic Node-to-Pod Inhibition

Suppress pod alerts when their node is down:

```yaml
inhibit_rules:
# Inhibit pod alerts when node is down

- source_matchers:
    - alertname="NodeDown"
  target_matchers:
    - alertname=~"PodNotReady|PodCrashLooping|ContainerRestart"
  equal:
    - node
```

This prevents alerting on pod issues that are caused by node failures.

## Cluster-Level Inhibition

Suppress namespace-level alerts when entire cluster is unhealthy:

```yaml
inhibit_rules:
# Inhibit all namespace alerts when cluster API is down
- source_matchers:
    - alertname="KubernetesAPIDown"
  target_matchers:
    - severity=~"warning|info"
  equal:
    - cluster

# Inhibit namespace alerts when cluster has no healthy nodes
- source_matchers:
    - alertname="NoHealthyNodes"
  target_matchers:
    - namespace=~".+"
  equal:
    - cluster
```

When fundamental cluster components fail, suppress the flood of resulting alerts.

## Severity-Based Inhibition

Critical alerts suppress warnings for the same component:

```yaml
inhibit_rules:
# Critical alerts suppress warnings for same service
- source_matchers:
    - severity="critical"
  target_matchers:
    - severity="warning"
  equal:
    - namespace
    - alertname

# Critical errors suppress info alerts
- source_matchers:
    - severity="critical"
  target_matchers:
    - severity="info"
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
- source_matchers:
    - alertname="IngressControllerDown"
  target_matchers:
    - alertname=~"ServiceUnavailable|EndpointDown|HTTPProbeFailure"
  equal:
    - cluster

# Inhibit inter-pod network alerts when CNI is failing
- source_matchers:
    - alertname="CNIPluginFailed"
  target_matchers:
    - alertname=~".*Network.*|.*Connection.*"
  equal:
    - cluster
```

## Database Inhibition Rules

Suppress application alerts when database is down:

```yaml
inhibit_rules:
# Inhibit app errors when database is down
- source_matchers:
    - alertname="DatabaseDown"
  target_matchers:
    - alertname=~"HighErrorRate|SlowResponses|APIFailure"
  equal:
    - namespace

# Inhibit read replica alerts when primary is down
- source_matchers:
    - alertname="PostgresPrimaryDown"
  target_matchers:
    - alertname="PostgresReplicaLag"
  equal:
    - cluster
    - database_cluster
```

## Storage Inhibition Rules

Suppress pod alerts when persistent volumes have issues:

```yaml
inhibit_rules:
# Inhibit pod alerts when PV is unavailable
- source_matchers:
    - alertname="PersistentVolumeUnavailable"
  target_matchers:
    - alertname=~"PodNotReady|PodCrashLooping"
  equal:
    - namespace
    - persistentvolumeclaim

# Inhibit app alerts when disk is full
- source_matchers:
    - alertname="DiskFull"
  target_matchers:
    - alertname=~".*Error.*|.*Failed.*"
  equal:
    - node
```

## Deployment Inhibition

Suppress alerts during active deployments:

```yaml
inhibit_rules:
# Inhibit pod restart alerts during rollout
- source_matchers:
    - alertname="RolloutInProgress"
  target_matchers:
    - alertname=~"PodRestart|PodCrashLooping"
  equal:
    - namespace
    - deployment

# Inhibit availability alerts during scheduled rollout
- source_matchers:
    - alertname="ScheduledDeployment"
  target_matchers:
    - severity="warning"
  equal:
    - namespace
```

Combine with deployment automation or alerting rules to create these alerts during deployments.

## Complete Inhibition Configuration

Here's a comprehensive inhibition ruleset for Kubernetes:

```yaml
inhibit_rules:
# Cluster-level inhibitions
- source_matchers:
    - alertname="KubernetesAPIDown"
  target_matchers:
    - severity=~"warning|info"
  equal:
    - cluster

- source_matchers:
    - alertname="KubeletDown"
  target_matchers:
    - alertname=~"NodeNotReady|NodeMemoryPressure|NodeDiskPressure"
  equal:
    - node

# Node-level inhibitions
- source_matchers:
    - alertname="NodeDown"
  target_matchers:
    - alertname=~".+"
  equal:
    - node

- source_matchers:
    - alertname="NodeNotReady"
  target_matchers:
    - alertname=~"PodNotReady|PodCrashLooping|ContainerRestart"
  equal:
    - node

- source_matchers:
    - alertname="NodeDiskFull"
  target_matchers:
    - alertname=~"PodEvicted|PodCrashLooping"
  equal:
    - node

# Network inhibitions
- source_matchers:
    - alertname="IngressControllerDown"
  target_matchers:
    - alertname=~"HTTPProbeFailure|ServiceUnavailable|EndpointDown"
  equal:
    - cluster

- source_matchers:
    - alertname="DNSFailure"
  target_matchers:
    - alertname=~"ServiceDiscoveryFailed|EndpointNotFound"
  equal:
    - cluster

# Storage inhibitions
- source_matchers:
    - alertname="PersistentVolumeUnavailable"
  target_matchers:
    - alertname=~"PodNotReady|PodCrashLooping"
  equal:
    - namespace
    - persistentvolumeclaim

- source_matchers:
    - alertname="StorageClassUnavailable"
  target_matchers:
    - alertname="PVCPendingBinding"
  equal:
    - cluster
    - storageclass

# Database inhibitions
- source_matchers:
    - alertname="DatabaseDown"
  target_matchers:
    - alertname=~"HighErrorRate|SlowAPIResponse|ConnectionPoolExhausted"
  equal:
    - namespace

- source_matchers:
    - alertname="PostgresPrimaryDown"
  target_matchers:
    - alertname=~"PostgresReplicaLag|PostgresReplicationBroken"
  equal:
    - database_cluster

# Severity-based inhibitions
- source_matchers:
    - severity="critical"
  target_matchers:
    - severity="warning"
  equal:
    - namespace
    - alertname

- source_matchers:
    - severity="critical"
  target_matchers:
    - severity="info"
  equal:
    - namespace
    - service

# Deployment inhibitions
- source_matchers:
    - alertname="RollingUpdateInProgress"
  target_matchers:
    - alertname=~"PodRestart|ContainerRestart"
    - severity="warning"
  equal:
    - namespace
    - deployment

# Maintenance window inhibitions
- source_matchers:
    - alertname="MaintenanceMode"
  target_matchers:
    - severity=~"warning|info"
  equal:
    - namespace
```

## Testing Inhibition Rules

Verify inhibition works correctly:

```bash
# Fire source alert (simulate node down)
curl -X POST http://alertmanager:9093/api/v2/alerts \
  -H 'Content-Type: application/json' <<EOF
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
curl -X POST http://alertmanager:9093/api/v2/alerts \
  -H 'Content-Type: application/json' <<EOF
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

Track suppressed alerts, including inhibited and silenced alerts:

```promql
# Number of suppressed alerts
alertmanager_alerts{state="suppressed"}

# Suppressed alerts by alert name
sum by (alertname) (
  alertmanager_alerts{state="suppressed"}
)
```

Create dashboards showing:

- Active vs suppressed alert counts
- Most frequently suppressed alert types
- Inhibition rule effectiveness

## Avoiding Over-Inhibition

Be careful not to suppress alerts that indicate independent issues:

```yaml
# Bad - too broad
- source_matchers:
    - severity="critical"
  target_matchers:
    - alertname=~".+"  # Suppresses almost everything!

# Good - specific
- source_matchers:
    - alertname="NodeDown"
  target_matchers:
    - alertname=~"PodNotReady|PodCrashLooping"
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
  - matchers:
      - severity="critical"
    receiver: oncall

  # Route warnings with grouping to reduce noise
  - matchers:
      - severity="warning"
    receiver: slack
    group_wait: 30s
    group_interval: 5m

inhibit_rules:
# Critical alerts suppress warnings
- source_matchers:
    - severity="critical"
  target_matchers:
    - severity="warning"
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
- source_matchers:
    - alertname="ClusterUnderMaintenance"
  target_matchers:
    - severity="warning"
  equal:
    - cluster
```

## Debugging Inhibition Issues

If alerts aren't being inhibited:

1. Validate the Alertmanager configuration with amtool:

```bash
amtool check-config alertmanager.yml
```

2. Verify equal labels exist on both alerts
3. Use `amtool config routes test` if you also need to verify routing for the target alert
4. Use Alertmanager UI to see inhibition status

Well-designed inhibition rules dramatically reduce alert noise by automatically suppressing cascading failures while preserving root cause visibility.
