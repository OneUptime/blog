# Idle Resource Detection with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Resource Optimization, GitOps, Kubernetes, Cost Optimization, Idle Resources

Description: Detect and manage idle Kubernetes resources using Flux CD, covering automated detection, GitOps-based cleanup workflows, and cost optimization strategies.

---

## Introduction

Idle resources — deployments running with near-zero traffic, namespaces created for testing and forgotten, jobs that completed weeks ago — are a silent cost drain in Kubernetes clusters. Flux CD's GitOps model actually helps with idle resource management: if a resource is not in Git, it should not be in the cluster.

This post covers strategies for detecting idle resources, using Flux's `prune` feature to remove resources not in Git, and building automated workflows to flag and remove genuinely idle workloads.

## Prerequisites

- Kubernetes cluster with Flux CD installed
- Prometheus and metrics-server installed for resource usage data
- `kubectl` access to the cluster
- Flux `prune: true` enabled on Kustomizations (critical for this workflow)

## Step 1: Enable Flux Pruning for Automatic Cleanup

Flux's `prune` feature removes Kubernetes resources that are no longer present in Git. This is the first line of defense against idle resource accumulation.

```yaml
# kustomization-with-prune.yaml - Enable pruning so deleted resources are removed
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: applications
  namespace: flux-system
spec:
  interval: 10m
  path: ./apps/production
  prune: true    # Resources deleted from Git will be deleted from the cluster
  sourceRef:
    kind: GitRepository
    name: fleet-infra
  # Wait up to 5 minutes for health checks before marking as failed
  timeout: 5m
```

Verify pruning is working by checking for "pruned" events:

```bash
# Check Flux events to see which resources have been pruned recently
kubectl get events -n flux-system | grep "pruned"

# List all Kustomizations and verify prune is enabled
flux get kustomizations -A
```

## Step 2: Detect Idle Deployments with Prometheus

Query Prometheus to find deployments with near-zero request rates:

```bash
# PromQL query to find deployments with less than 1 RPS average over 24 hours
# Run this via Prometheus API or in Grafana
echo 'Idle services query (run in Prometheus):'
echo 'sum(rate(http_requests_total[24h])) by (deployment, namespace) < 1'

# Find pods consuming near-zero CPU over the last 24 hours
echo 'Idle pods by CPU (run in Prometheus):'
echo 'avg_over_time(rate(container_cpu_usage_seconds_total{container!=""}[5m])[24h:5m]) < 0.001'
```

Create a Prometheus recording rule for idle resource tracking:

```yaml
# idle-resource-rules.yaml - Prometheus recording rules for idle detection
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: idle-resource-detection
  namespace: monitoring
  labels:
    release: kube-prometheus-stack
spec:
  groups:
    - name: idle-resources
      interval: 1h
      rules:
        # Flag deployments with 0 requests in the last 7 days
        - record: deployment:idle:indicator
          expr: |
            sum(
              increase(http_requests_total[7d])
            ) by (namespace, pod) == 0
        # Flag any deployment with less than 1m CPU average over 7 days
        - record: deployment:low_cpu:7d
          expr: |
            avg_over_time(
              rate(container_cpu_usage_seconds_total{container!=""}[5m])[7d:5m]
            ) < 0.001
```

## Step 3: Automated Idle Resource Reporting

Create a CronJob that reports idle resources weekly:

```yaml
# idle-report-cronjob.yaml - Weekly idle resource report via Flux
apiVersion: batch/v1
kind: CronJob
metadata:
  name: idle-resource-reporter
  namespace: flux-system
spec:
  # Run every Monday at 9 AM UTC
  schedule: "0 9 * * 1"
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: idle-reporter
          containers:
            - name: reporter
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  echo "=== Deployments with 0 replicas (scaled down) ==="
                  kubectl get deployments -A -o json | \
                    python3 -c "
import json,sys
data=json.load(sys.stdin)
for item in data['items']:
  name=item['metadata']['name']
  ns=item['metadata']['namespace']
  replicas=item['spec'].get('replicas',1)
  if replicas == 0:
    print(f'{ns}/{name}: replicas=0')
"
                  echo "=== Completed Jobs older than 7 days ==="
                  kubectl get jobs -A --sort-by=.metadata.creationTimestamp
          restartPolicy: OnFailure
```

## Step 4: Namespace TTL with Flux

For development namespaces, add TTL labels and a controller that removes expired namespaces:

```yaml
# dev-namespace.yaml - Namespace with TTL annotation for automatic cleanup
apiVersion: v1
kind: Namespace
metadata:
  name: feature-branch-123
  labels:
    # Label for TTL-based cleanup controllers like kube-janitor
    janitor/ttl: "7d"
    managed-by: flux
  annotations:
    # Document creation reason for audit
    flux.weave.works/reason: "Feature branch environment"
    flux.weave.works/created: "2026-03-13"
```

## Best Practices

- Enable `prune: true` on all Flux Kustomizations — it is the most important GitOps hygiene setting
- Schedule weekly idle resource reports and assign a rotation to review them
- Use namespace-level ResourceQuotas to limit idle resource waste even when pruning is not immediate
- Implement a PR-based review process for any new namespace creation to prevent namespace sprawl
- Use Grafana dashboards to visualize resource utilization trends over 30/60/90 day windows

## Conclusion

Idle resource detection in Flux-managed clusters starts with enabling `prune: true` everywhere, which ensures the cluster only runs what is declared in Git. Complement this with Prometheus-based idle detection, automated reporting CronJobs, and namespace TTL policies for development environments. The result is a self-cleaning cluster where resource waste is systematically detected and eliminated, reducing cloud costs without manual intervention.
