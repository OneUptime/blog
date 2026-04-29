# How to Monitor Fleet Deployment Progress - Monitor

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rancher, Fleet, GitOps, Monitoring, Kubernetes, Observability

Description: Monitor Rancher Fleet deployment progress using kubectl, the Rancher UI, Prometheus metrics, and alerting to ensure GitOps deployments succeed across all target clusters.

## Introduction

Rancher Fleet manages GitOps deployments across multiple clusters simultaneously. Monitoring deployment progress is essential to detect drift, failures, and partial rollouts before they impact users. Fleet exposes status information through Kubernetes resources, a web UI, and Prometheus metrics.

## Fleet Resource Hierarchy

```text
GitRepo
  └── Bundle (one per directory with fleet.yaml)
        └── BundleDeployment (one per matching cluster)
              └── Application Resources (actual K8s objects)
```

## Step 1: Monitor via kubectl

```bash
# Overview of all GitRepos and their sync status

kubectl get gitrepos -A

# Example output:
# NAMESPACE      NAME              REPO                        COMMIT   BUNDLEDEPLOYMENTS-READY
# fleet-default  myapp-production  https://github.com/...     abc1234  3/3

# Check detailed status of a GitRepo
kubectl describe gitrepo myapp-production -n fleet-default

# Watch deployment progress in real-time
kubectl get gitrepos -n fleet-default -w

# Check bundle status
kubectl get bundles -n fleet-default

# Check individual bundle deployments per cluster
kubectl get bundledeployments -A

# Get detailed status of a specific BundleDeployment
kubectl describe bundledeployment myapp-production-cluster1 -n fleet-default
```

## Step 2: Understand Status Conditions

Fleet resources use conditions to communicate status:

```bash
# Check GitRepo conditions
kubectl get gitrepo myapp-production -n fleet-default \
  -o jsonpath='{.status.conditions}' | jq .

# Key conditions to watch:
# - Ready: true = all bundle deployments are ready
# - Stalled: true = deployment is stuck
# - Modified: true = cluster resources differ from Git

# Check for errors
kubectl get gitrepo myapp-production -n fleet-default \
  -o jsonpath='{.status.display}' | jq .
```

## Step 3: Monitor via Rancher UI

Navigate in Rancher UI:
1. Go to **Continuous Delivery** (Fleet) in the left sidebar
2. Select **Git Repos** to see all repositories and their sync status
3. Click a GitRepo to see per-cluster deployment status
4. **Clusters** view shows cluster health and bundle counts
5. **Bundles** view shows individual bundle sync state

Status indicators:
- **Active**: Deployed and in sync with Git
- **Modified**: Cluster resources differ from Git (drift detected)
- **Pending**: Waiting to be deployed
- **Err Applied**: Deployment failed with errors

## Step 4: Prometheus Metrics

Fleet exposes metrics via the `fleet-controller`:

```yaml
# Create ServiceMonitor for Fleet (if using Prometheus Operator)
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: fleet-controller
  namespace: cattle-fleet-system
spec:
  selector:
    matchLabels:
      app: fleet-controller
  endpoints:
    - port: metrics
      interval: 30s
```

Key Fleet metrics:

```text
# GitRepo cluster readiness (compare desired vs ready)
fleet_gitrepo_desired_ready_clusters{namespace="fleet-default", name="myapp"} 3
fleet_gitrepo_ready_clusters{namespace="fleet-default", name="myapp"} 3

# GitRepo resource counts
fleet_gitrepo_resources_desired_ready{namespace="fleet-default", name="myapp"} 12
fleet_gitrepo_resources_ready{namespace="fleet-default", name="myapp"} 12

# Bundle deployment counts
fleet_bundle_desired_ready{namespace="fleet-default"} 5
fleet_bundle_ready{namespace="fleet-default"} 5

# BundleDeployment status (1 = currently in this state, 0 = not)
fleet_bundledeployment_state{cluster_name="prod-cluster", bundle="myapp", state="Ready"} 1
```

## Step 5: Configure Alerts

```yaml
# prometheusrule for Fleet alerts
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: fleet-alerts
  namespace: cattle-fleet-system
spec:
  groups:
    - name: fleet
      rules:
        - alert: FleetGitRepoNotReady
          expr: |
            fleet_gitrepo_desired_ready_clusters - fleet_gitrepo_ready_clusters > 0
          for: 5m
          annotations:
            summary: "Fleet GitRepo {{ $labels.name }} is not ready on all clusters"
            description: "GitRepo has had fewer ready clusters than desired for 5 minutes"
          labels:
            severity: warning

        - alert: FleetBundleDeploymentFailed
          expr: |
            fleet_bundledeployment_state{state="ErrApplied"} == 1
          for: 10m
          annotations:
            summary: "Fleet bundle deployment failed on cluster {{ $labels.cluster_name }}"
          labels:
            severity: critical
```

## Step 6: Automation and Forced Re-sync

```bash
# Roll up bundle deployment status across all clusters
kubectl get bundledeployments -A \
  -o custom-columns=CLUSTER:.metadata.labels.fleet\.cattle\.io/cluster,BUNDLE:.metadata.labels.fleet\.cattle\.io/bundle-name,READY:.status.ready,DEPLOYED:.status.appliedDeploymentID

# Force re-sync of a GitRepo by bumping spec.forceSyncGeneration
kubectl patch gitrepo myapp-production -n fleet-default \
  --type=merge \
  -p '{"spec":{"forceSyncGeneration":'$(date +%s)'}}'

# View recent events for debugging
kubectl get events -n fleet-default \
  --sort-by='.lastTimestamp' | tail -20
```

## Conclusion

Monitoring Fleet deployments combines kubectl resource inspection, the Rancher UI dashboard, Prometheus metrics, and alerting rules. The key resources to watch are `GitRepo` for overall sync state and `BundleDeployment` for per-cluster deployment status. Setting up alerts for failed deployments ensures the team is notified when GitOps pipelines stall, maintaining reliable continuous delivery across all Rancher-managed clusters.
