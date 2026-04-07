# How to Set Resources for Rook-Ceph Log Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Rook, Ceph, Kubernetes, Log Collector, Resource, Pod, Logging

Description: Configure resource requests and limits for Rook-Ceph log collector pods to ensure Ceph daemon logs are collected reliably and efficiently across all cluster nodes.

---

## Overview

The Rook-Ceph log collector gathers logs from Ceph daemons running on each Kubernetes node and makes them accessible via standard `kubectl logs`. It runs as a sidecar container within each Ceph daemon pod, handling log file rotation and cleanup. Proper resource allocation ensures log collection keeps up with high-volume logging without impacting Ceph daemon performance.

## Configuring Log Collector Resources

```yaml
apiVersion: ceph.rook.io/v1
kind: CephCluster
metadata:
  name: rook-ceph
  namespace: rook-ceph
spec:
  logCollector:
    enabled: true
    periodicity: "daily"
    maxLogSize: "500M"
  resources:
    logcollector:
      requests:
        cpu: "100m"
        memory: "100Mi"
      limits:
        cpu: "500m"
        memory: "1Gi"
```

Apply and check:

```bash
kubectl apply -f cephcluster.yaml

# Verify log collector sidecar in daemon pods
kubectl -n rook-ceph get pods -l app=rook-ceph-osd

# Check resource settings on a daemon pod's log-collector container
kubectl -n rook-ceph describe pod <daemon-pod-name> | \
    grep -A10 "log-collector" | grep -A10 "Limits:"
```

## Log Collector Configuration Options

```yaml
spec:
  logCollector:
    enabled: true
    # How often to rotate collected logs
    periodicity: "daily"   # Options: hourly, daily, weekly, monthly
    # Maximum size before rotation
    maxLogSize: "500M"
```

## Viewing Collected Logs

```bash
# View logs from a daemon pod's log-collector sidecar
kubectl -n rook-ceph logs <daemon-pod-name> -c log-collector

# Follow logs in real time
kubectl -n rook-ceph logs -f <daemon-pod-name> -c log-collector

# Check log sizes on node
kubectl -n rook-ceph exec <daemon-pod-name> -c log-collector -- \
    ls -lh /var/log/ceph/
```

## Resource Impact of High Log Verbosity

When debugging is enabled, log volume increases dramatically:

```bash
# Check current debug log levels
kubectl -n rook-ceph exec deploy/rook-ceph-tools -- \
    ceph config get osd debug_osd

# High verbosity (debug level 20) can generate 100+ MB/min
# Increase log collector memory limit temporarily during debug sessions
```

```yaml
# Temporary high-verbosity resource override
spec:
  resources:
    logcollector:
      requests:
        cpu: "200m"
        memory: "512Mi"
      limits:
        cpu: "1000m"
        memory: "2Gi"
```

## Log Rotation and Disk Space

```bash
# Check disk usage by log collector on a node
kubectl -n rook-ceph exec <daemon-pod-name> -c log-collector -- \
    du -sh /var/log/ceph/*

# Log rotation is handled automatically by the sidecar based on
# the periodicity and maxLogSize settings in spec.logCollector
```

## Integrating with External Log Systems

For production, forward logs to a central system:

```yaml
# Fluent Bit DaemonSet to forward Ceph logs to Elasticsearch
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-ceph
  namespace: rook-ceph
data:
  fluent-bit.conf: |
    [INPUT]
        Name   tail
        Path   /var/log/ceph/*.log
        Tag    ceph.*

    [OUTPUT]
        Name   es
        Match  ceph.*
        Host   elasticsearch.logging.svc
        Port   9200
        Index  ceph-logs
```

## Sizing Guidelines

| Cluster Debug Level | CPU Request | Memory Limit | Notes |
|---|---|---|---|
| Normal (level 1) | 100m | 256Mi | Low log volume |
| Moderate (level 5) | 200m | 512Mi | Elevated during tuning |
| Debug (level 10+) | 500m | 1Gi | Short-term debugging only |
| Max debug (level 20) | 1000m | 2Gi | Emergency diagnosis only |

## Summary

Rook-Ceph log collector pods are lightweight under normal conditions but can require more resources during debug logging sessions. Configure the base memory limit at 256-512Mi and increase temporarily when enabling verbose logging. Set the `maxLogSize` and `periodicity` options to prevent runaway disk consumption, and consider forwarding logs to an external system for long-term retention and analysis.
