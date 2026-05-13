# Idle Resource Detection with Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Resource Optimization, GitOps, Kubernetes, Cost Optimization, Idle Resources

Description: Detect and manage idle Kubernetes resources using Flux CD, covering automated detection, GitOps-based cleanup workflows, and cost optimization strategies.

---

## Introduction

Idle resources - deployments running with near-zero traffic, namespaces created for testing and forgotten, jobs that completed weeks ago - are a silent cost drain in Kubernetes clusters. Flux CD's GitOps model actually helps with idle resource management: if a resource is managed by Flux and removed from Git, it should be removed from the cluster.

This post covers strategies for detecting idle resources, using Flux's `prune` feature to remove stale Flux-managed resources after they are removed from Git, and building automated workflows to flag and remove genuinely idle workloads.

## Prerequisites

- Kubernetes cluster with Flux CD installed
- Prometheus installed for resource usage data; metrics-server is optional for `kubectl top` checks
- `kubectl` access to the cluster
- Flux `prune: true` enabled on Kustomizations (critical for this workflow)

## Step 1: Enable Flux Pruning for Automatic Cleanup

Flux's `prune` feature removes Kubernetes resources that were previously applied by a Kustomization and are no longer present in that Kustomization's source. This is the first line of defense against idle resource accumulation in Flux-managed resources.

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
  prune: true    # Resources deleted from this Git path will be deleted from the cluster
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

If your applications expose HTTP request counters with workload labels, query Prometheus to find deployments with near-zero request rates:

```bash
# PromQL query to find deployments with less than 1 RPS average over 24 hours
# Run this via Prometheus API or in Grafana
echo 'Idle services query (run in Prometheus):'
echo 'sum(rate(http_requests_total[24h])) by (deployment, namespace) < 1'

# Find pods consuming near-zero CPU over the last 24 hours
echo 'Idle pods by CPU (run in Prometheus):'
echo 'sum by (namespace, pod) (avg_over_time(rate(container_cpu_usage_seconds_total{container!="", pod!=""}[5m])[24h:5m])) < 0.001'
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
            ) by (namespace, deployment) == 0
        # Flag any pod with less than 1m CPU average over 7 days
        - record: pod:low_cpu:7d
          expr: |
            sum by (namespace, pod) (
              avg_over_time(
                rate(container_cpu_usage_seconds_total{container!="", pod!=""}[5m])[7d:5m]
              )
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
                  kubectl get deployments -A \
                    -o jsonpath='{range .items[?(@.spec.replicas==0)]}{.metadata.namespace}/{.metadata.name}: replicas=0{"\n"}{end}'
                  echo "=== Completed Jobs older than 7 days ==="
                  cutoff="$(date -u -d '7 days ago' +%s)"
                  kubectl get jobs -A \
                    -o jsonpath='{range .items[?(@.status.succeeded==1)]}{.metadata.namespace}{"\t"}{.metadata.name}{"\t"}{.status.completionTime}{"\n"}{end}' | \
                    while IFS="$(printf '\t')" read -r ns name completed_at; do
                      [ -z "$completed_at" ] && continue
                      completed_epoch="$(date -u -d "$completed_at" +%s)"
                      if [ "$completed_epoch" -lt "$cutoff" ]; then
                        echo "$ns/$name completed_at=$completed_at"
                      fi
                    done
          restartPolicy: OnFailure
```

## Step 4: Namespace TTL with Flux

For development namespaces, add TTL annotations and a controller that removes expired namespaces:

```yaml
# dev-namespace.yaml - Namespace with TTL annotation for automatic cleanup
apiVersion: v1
kind: Namespace
metadata:
  name: feature-branch-123
  labels:
    managed-by: flux
  annotations:
    # Annotation for TTL-based cleanup controllers like kube-janitor
    janitor/ttl: "7d"
    # Document creation reason for audit
    platform.example.com/reason: "Feature branch environment"
    platform.example.com/created: "2026-03-13"
```

## Best Practices

- Enable `prune: true` on all Flux Kustomizations - it is the most important GitOps hygiene setting
- Schedule weekly idle resource reports and assign a rotation to review them
- Use namespace-level ResourceQuotas to limit idle resource waste even when pruning is not immediate
- Implement a PR-based review process for any new namespace creation to prevent namespace sprawl
- Use Grafana dashboards to visualize resource utilization trends over 30/60/90 day windows

## Conclusion

Idle resource detection in Flux-managed clusters starts with enabling `prune: true` everywhere, which ensures Flux removes stale resources it previously applied when they are removed from Git. Complement this with Prometheus-based idle detection, automated reporting CronJobs, and namespace TTL policies for development environments. The result is a self-cleaning cluster where resource waste is systematically detected and eliminated, reducing cloud costs without manual intervention.
