# How to Monitor ArgoCD Disk Usage

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Monitoring, Storage

Description: Learn how to monitor ArgoCD disk usage across the repo server, application controller, and Redis to prevent storage-related failures in your GitOps pipeline.

---

ArgoCD uses disk space in several components, and running out of storage can cause some of the most confusing failures you will encounter. The repo server clones Git repositories to local disk, the application controller writes temporary files during manifest generation, and even Redis (if persistence is enabled) can consume significant storage. This guide shows you how to monitor all of it.

## Where ArgoCD Uses Disk

Understanding which components use disk and why helps you know what to monitor:

**Repo Server**: This is the biggest disk consumer. It clones every Git repository that your applications reference. For large monorepos, this can be gigabytes of storage. The repo server also stores rendered manifests temporarily during the generation phase.

**Application Controller**: The controller writes temporary files during diff calculations and sync operations. These are usually small but can accumulate if garbage collection is not working properly.

**Redis**: If you accidentally enabled persistence (RDB or AOF), Redis writes snapshots to disk. ArgoCD Redis should run without persistence, but misconfigurations happen.

**Dex Server**: Stores its SQLite database for OAuth state. This is typically tiny but worth monitoring.

## Checking Disk Usage Manually

Start by checking the current state of your ArgoCD pods:

```bash
# Check repo server disk usage
kubectl exec -n argocd deploy/argocd-repo-server -- df -h /tmp
kubectl exec -n argocd deploy/argocd-repo-server -- du -sh /tmp/_argocd-repo

# Check application controller disk usage
kubectl exec -n argocd deploy/argocd-application-controller -- df -h /tmp

# Check Redis disk usage (if using a PVC)
kubectl exec -n argocd deploy/argocd-redis -- df -h /data
```

For the repo server, you can also see how much space each cloned repository consumes:

```bash
# List all cloned repos and their sizes
kubectl exec -n argocd deploy/argocd-repo-server -- \
  du -sh /tmp/_argocd-repo/* 2>/dev/null | sort -rh | head -20
```

## Monitoring with Prometheus

Kubernetes exposes container filesystem metrics through the kubelet. You can use these to monitor ArgoCD disk usage without installing anything extra.

### Key Metrics

```promql
# Filesystem usage for the repo server container
container_fs_usage_bytes{
  namespace="argocd",
  pod=~"argocd-repo-server.*",
  container="argocd-repo-server"
}

# Filesystem capacity
container_fs_limit_bytes{
  namespace="argocd",
  pod=~"argocd-repo-server.*",
  container="argocd-repo-server"
}

# Disk usage percentage
container_fs_usage_bytes{namespace="argocd", pod=~"argocd-repo-server.*"} /
container_fs_limit_bytes{namespace="argocd", pod=~"argocd-repo-server.*"}

# Ephemeral storage usage for all ArgoCD pods
kube_pod_resource_request{
  namespace="argocd",
  resource="ephemeral-storage"
}
```

If you are using PersistentVolumeClaims for any ArgoCD component, monitor those as well:

```promql
# PVC usage (requires kubelet volume stats)
kubelet_volume_stats_used_bytes{namespace="argocd"}

# PVC capacity
kubelet_volume_stats_capacity_bytes{namespace="argocd"}

# PVC usage percentage
kubelet_volume_stats_used_bytes{namespace="argocd"} /
kubelet_volume_stats_capacity_bytes{namespace="argocd"}
```

### Custom Metrics with a Sidecar

For more detailed monitoring of the repo server's Git clone directories, you can add a simple sidecar that exports disk metrics:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          # ... existing config ...
        - name: disk-monitor
          image: alpine:3.19
          command:
            - /bin/sh
            - -c
            - |
              apk add --no-cache curl
              while true; do
                REPO_SIZE=$(du -sb /tmp/_argocd-repo 2>/dev/null | cut -f1 || echo 0)
                TMP_SIZE=$(du -sb /tmp 2>/dev/null | cut -f1 || echo 0)
                echo "# HELP argocd_repo_server_repo_dir_bytes Size of cloned repos directory"
                echo "# TYPE argocd_repo_server_repo_dir_bytes gauge"
                echo "argocd_repo_server_repo_dir_bytes $REPO_SIZE"
                echo "# HELP argocd_repo_server_tmp_dir_bytes Total tmp directory size"
                echo "# TYPE argocd_repo_server_tmp_dir_bytes gauge"
                echo "argocd_repo_server_tmp_dir_bytes $TMP_SIZE"
                sleep 60
              done > /tmp/metrics &
              # Simple HTTP server for metrics
              while true; do
                { echo -ne "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\n"; cat /tmp/metrics; } | nc -l -p 9102 || true
              done
          ports:
            - containerPort: 9102
              name: disk-metrics
          volumeMounts:
            - name: tmp
              mountPath: /tmp
              readOnly: true
          resources:
            requests:
              cpu: 5m
              memory: 16Mi
            limits:
              cpu: 50m
              memory: 32Mi
```

## Setting Up Alerts

Create alerting rules for disk-related issues:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-disk-alerts
  namespace: argocd
spec:
  groups:
    - name: argocd-disk
      rules:
        # Alert when repo server ephemeral storage is running high
        - alert: ArgoCDRepoServerDiskHigh
          expr: |
            container_fs_usage_bytes{
              namespace="argocd",
              pod=~"argocd-repo-server.*",
              container="argocd-repo-server"
            } / container_fs_limit_bytes{
              namespace="argocd",
              pod=~"argocd-repo-server.*",
              container="argocd-repo-server"
            } > 0.8
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD repo server disk usage above 80%"
            description: "Pod {{ $labels.pod }} is using {{ $value | humanizePercentage }} of disk"

        # Alert when any ArgoCD PVC is filling up
        - alert: ArgoCDPVCNearlyFull
          expr: |
            kubelet_volume_stats_used_bytes{namespace="argocd"} /
            kubelet_volume_stats_capacity_bytes{namespace="argocd"} > 0.85
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD PVC nearly full"
            description: "PVC {{ $labels.persistentvolumeclaim }} is {{ $value | humanizePercentage }} full"

        # Alert when a pod is evicted due to ephemeral storage
        - alert: ArgoCDPodEvictedDiskPressure
          expr: |
            kube_pod_status_reason{
              namespace="argocd",
              reason="Evicted"
            } > 0
          for: 1m
          labels:
            severity: critical
          annotations:
            summary: "ArgoCD pod evicted"
            description: "Pod {{ $labels.pod }} was evicted, possibly due to disk pressure"
```

## Grafana Dashboard Panels

Add these panels to your ArgoCD monitoring dashboard:

```json
{
  "panels": [
    {
      "title": "Repo Server Disk Usage",
      "type": "timeseries",
      "targets": [
        {
          "expr": "container_fs_usage_bytes{namespace=\"argocd\", pod=~\"argocd-repo-server.*\", container=\"argocd-repo-server\"}",
          "legendFormat": "{{ pod }}"
        }
      ]
    },
    {
      "title": "Disk Usage by Component",
      "type": "bargauge",
      "targets": [
        {
          "expr": "sum by (pod) (container_fs_usage_bytes{namespace=\"argocd\", container!=\"POD\", container!=\"\"})",
          "legendFormat": "{{ pod }}"
        }
      ]
    },
    {
      "title": "PVC Usage",
      "type": "gauge",
      "targets": [
        {
          "expr": "kubelet_volume_stats_used_bytes{namespace=\"argocd\"} / kubelet_volume_stats_capacity_bytes{namespace=\"argocd\"}",
          "legendFormat": "{{ persistentvolumeclaim }}"
        }
      ]
    }
  ]
}
```

## Configuring Ephemeral Storage Limits

Set explicit ephemeral storage limits on ArgoCD pods to prevent runaway disk usage from affecting other workloads on the node:

```yaml
# Repo server - needs the most disk for Git clones
resources:
  requests:
    ephemeral-storage: 2Gi
  limits:
    ephemeral-storage: 5Gi

# Application controller
resources:
  requests:
    ephemeral-storage: 512Mi
  limits:
    ephemeral-storage: 2Gi

# Redis (no persistence mode)
resources:
  requests:
    ephemeral-storage: 256Mi
  limits:
    ephemeral-storage: 512Mi
```

## Reducing Disk Usage

If your repo server is consuming too much disk, there are several strategies to reduce usage:

**Reduce clone depth**: Configure shallow clones for repositories that do not need full history:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Only fetch the latest commit
  reposerver.git.request.timeout: "60"
```

**Increase repo cache expiration**: Reduce how often repos are re-cloned by keeping them cached longer.

**Use Git subpath**: If you have a monorepo, configure your applications to use a specific path rather than cloning the entire repository.

**Clean up unused repos**: Remove repository credentials for repos that are no longer referenced by any application. The repo server will clean up the clones.

## Monitoring the Repo Server Process

The ArgoCD repo server exposes metrics about its internal operations that relate to disk:

```promql
# Number of Git operations
rate(argocd_git_request_total{namespace="argocd"}[5m])

# Git fetch duration (slow fetches may indicate disk I/O issues)
histogram_quantile(0.95, rate(argocd_git_request_duration_seconds_bucket{namespace="argocd"}[5m]))
```

Slow Git operations can be a sign of disk I/O bottlenecks, especially on cloud providers where ephemeral storage performance varies by instance type.

## Integration with OneUptime

Push your disk metrics to OneUptime for unified monitoring across your infrastructure. Having disk usage alerts alongside your application health metrics helps correlate deployment failures with underlying resource constraints. Check out our ArgoCD metrics integration guide for setup instructions.

Disk monitoring is one of those things that seems unnecessary until a 3 AM page wakes you up because the repo server pod was evicted. Set up these metrics and alerts, and you will catch problems long before they become outages.
