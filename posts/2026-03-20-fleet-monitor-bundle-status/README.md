# How to Monitor Fleet Bundle Status

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Fleet, GitOps, Rancher, Kubernetes, Monitoring

Description: Learn how to monitor Fleet bundle deployment status across multiple clusters using kubectl commands, Rancher UI, and custom monitoring integrations.

## Introduction

Monitoring the deployment status of Fleet bundles across multiple clusters gives you visibility into the health of your GitOps pipeline. Fleet exposes rich status information through its custom resources, allowing you to build monitoring dashboards, set up alerting, and quickly identify deployment issues.

This guide covers the tools and techniques for monitoring Fleet bundle status effectively.

## Prerequisites

- Fleet installed and deployed
- GitRepo resources with active deployments
- `kubectl` access to Fleet manager
- Optionally: Prometheus/Grafana for metrics-based monitoring

## Core Status Monitoring Commands

### Quick Status Overview

```bash
# Summary view of all GitRepos

kubectl get gitrepo -A

# Summary view of all bundles with key status columns
kubectl get bundles -A

# Detailed bundle status with readiness counts
kubectl get bundles -A \
  -o custom-columns=\
'NAMESPACE:.metadata.namespace,\
NAME:.metadata.name,\
READY:.status.summary.ready,\
DESIRED:.status.summary.desiredReady,\
NOT-READY:.status.summary.notReady,\
MODIFIED:.status.summary.modified,\
ERRS:.status.summary.errApplied'

# All bundle deployments across clusters
kubectl get bundledeployments -A
```

### Real-Time Monitoring

```bash
# Watch GitRepo sync status in real-time
kubectl get gitrepo -n fleet-default -w

# Watch bundle status changes
kubectl get bundles -n fleet-default -w

# Watch bundle deployments (shows per-cluster status)
kubectl get bundledeployments -A -w
```

## Monitoring via Rancher UI

### Continuous Delivery Dashboard

1. Open Rancher and navigate to **Continuous Delivery**
2. The **Git Repos** view shows:
   - Sync status for each repository
   - Last successful sync time
   - Error messages for failed repos
3. The **Bundles** view shows:
   - Deployment status across clusters
   - Ready/Not Ready counts
   - Modified resource counts

### Cluster-Level Bundle Monitoring

1. Navigate to **Continuous Delivery > Clusters**
2. Click on a specific cluster
3. View the bundles deployed to that cluster and their states

## Detailed Status Investigation

### GitRepo Status Fields

```bash
# Get complete GitRepo status
kubectl get gitrepo my-app -n fleet-default \
  -o jsonpath-as-json='{.status}' | python3 -m json.tool

# Key fields to check:
# .status.commit - Currently synced Git commit SHA
# .status.conditions - Array of status conditions
# .status.readyClusters - Number of clusters synced successfully
# .status.desiredReadyClusters - Expected number of clusters
```

### Bundle Status Deep Dive

```bash
# Get comprehensive bundle status
kubectl get bundle my-app -n fleet-default \
  -o jsonpath-as-json='{.status.summary}' | python3 -m json.tool

# Get conditions
kubectl get bundle my-app -n fleet-default \
  -o jsonpath-as-json='{.status.conditions}' | python3 -m json.tool

# Get display summary showing the overall bundle state
kubectl get bundle my-app -n fleet-default \
  -o jsonpath-as-json='{.status.display}' | python3 -m json.tool
```

### BundleDeployment Per-Cluster Status

```bash
# List all bundle deployments with their cluster context
kubectl get bundledeployments -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace} {.metadata.name} ready={.status.ready} state={.status.display.state}{"\n"}{end}'

# Get the non-ready resources for a failing bundle deployment
kubectl get bundledeployment my-app \
  -n fleet-cluster-fleet-default-cluster-123 \
  -o jsonpath-as-json='{.status.nonReadyStatus}' | python3 -m json.tool
```

## Creating a Health Check Script

```bash
#!/bin/bash
# fleet-health-check.sh - Check overall Fleet health

echo "=== Fleet Health Report ==="
echo "Date: $(date)"
echo ""

echo "--- GitRepo Status ---"
kubectl get gitrepo -A \
  -o jsonpath='{range .items[*]}[{.metadata.namespace}/{.metadata.name}] commit={.status.commit} ready={.status.readyClusters}/{.status.desiredReadyClusters}{"\n"}{end}'

echo ""
echo "--- Bundle Summary ---"
kubectl get bundles -A \
  -o jsonpath='{range .items[*]}[{.metadata.namespace}/{.metadata.name}] ready={.status.summary.ready} desired={.status.summary.desiredReady} notReady={.status.summary.notReady} modified={.status.summary.modified}{"\n"}{end}'

echo ""
echo "--- Non-Ready Bundles ---"
kubectl get bundles -A \
  -o jsonpath='{range .items[*]}{.metadata.namespace} {.metadata.name} {.status.summary.notReady}{"\n"}{end}' \
  | awk '$3 > 0 {print $1 "/" $2 ": " $3 " clusters not ready"}'

echo ""
echo "--- Recent Events ---"
kubectl get events -A \
  --field-selector type=Warning \
  --sort-by='.metadata.creationTimestamp' \
  | tail -10
```

```bash
# Make executable and run
chmod +x fleet-health-check.sh
./fleet-health-check.sh
```

## Setting Up Prometheus Monitoring

Fleet exposes metrics via its controllers. Configure Prometheus to scrape them:

```yaml
# prometheus-fleet-monitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fleet-controller-monitor
  namespace: cattle-fleet-system
  labels:
    # Match your Prometheus operator's selector
    release: prometheus-stack
spec:
  selector:
    matchLabels:
      app: fleet-controller
  endpoints:
    - port: metrics
      interval: 30s
      path: /metrics
```

### Key Fleet Metrics to Monitor

- `fleet_bundle_ready`: Number of ready bundle deployments per bundle
- `fleet_bundle_desired_ready`: Number of bundle deployments expected to be ready
- `fleet_bundle_err_applied`: Number of bundle deployments with apply errors
- `fleet_bundle_state`: Overall bundle state label for alerting and dashboards

## Alerting on Deployment Failures

```yaml
# fleet-alerts.yaml - PrometheusRule for Fleet alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: fleet-alerts
  namespace: cattle-fleet-system
  labels:
    # Match your Prometheus operator's selector
    release: prometheus-stack
spec:
  groups:
    - name: fleet.rules
      rules:
        # Alert when bundles are not fully deployed after 10 minutes
        - alert: FleetBundleNotReady
          expr: |
            (fleet_bundle_desired_ready - fleet_bundle_ready) > 0
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "Fleet bundle {{ $labels.name }} has unready deployments"
            description: "Bundle {{ $labels.name }} has {{ $value }} clusters not ready"

        # Alert when bundle deployments report apply errors for 5 minutes
        - alert: FleetBundleApplyError
          expr: |
            fleet_bundle_err_applied > 0
          for: 5m
          labels:
            severity: critical
          annotations:
            summary: "Fleet bundle {{ $labels.name }} has apply errors"
```

## Conclusion

Effective monitoring of Fleet bundle status is essential for maintaining a healthy GitOps pipeline. By combining real-time kubectl monitoring, the Rancher UI dashboard, automated health check scripts, and Prometheus-based alerting, you build comprehensive visibility into your deployment pipeline. When bundles are not ready or GitRepos fail to sync, early detection through monitoring allows you to address issues before they impact end users or create significant configuration drift across your cluster fleet.
