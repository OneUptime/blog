# How to Implement Log Rotation for Flux CD Controllers

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Log Rotation, Logging, Kubernetes, GitOps, Observability, Controller

Description: A practical guide to implementing log rotation and management strategies for Flux CD controllers to prevent disk exhaustion and maintain observability.

---

## Introduction

Flux CD controllers generate logs continuously as they reconcile resources, pull from Git repositories, and apply changes to your cluster. Without proper log management, these logs can consume significant disk space, degrade node performance, and make it difficult to find relevant information during troubleshooting.

This guide covers how to implement log rotation for Flux CD controllers, configure log levels, set up centralized log collection, and manage log retention policies using GitOps principles.

## Prerequisites

- A Kubernetes cluster (v1.24+)
- Flux CD v2 installed and bootstrapped
- kubectl configured to access your cluster
- A logging stack (Fluentd/Fluent Bit, Loki, or Elasticsearch) for centralized logging

## Understanding Flux CD Controller Logging

Flux CD consists of several controllers, each producing its own log stream:

- **source-controller** - Logs for Git, Helm, and OCI repository operations
- **kustomize-controller** - Logs for Kustomization reconciliation
- **helm-controller** - Logs for HelmRelease operations
- **notification-controller** - Logs for alerts and event forwarding
- **image-reflector-controller** - Logs for image scanning
- **image-automation-controller** - Logs for image update commits

## Configuring Flux CD Controller Log Levels

Adjust log verbosity to reduce log volume while maintaining useful information.

```yaml
# clusters/production/flux-system/kustomization.yaml
# Kustomize patches to configure Flux controller log levels
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
  - gotk-sync.yaml
patches:
  # Reduce source-controller log verbosity in production
  - target:
      kind: Deployment
      name: source-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: source-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  # Reduce log encoding to JSON for structured logging
                  - --log-encoding=json
                  # Set storage limit to prevent disk exhaustion
                  - --storage-adv-addr=source-controller.flux-system.svc.cluster.local.
  # Configure kustomize-controller logging
  - target:
      kind: Deployment
      name: kustomize-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: kustomize-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  - --log-encoding=json
                  # Limit concurrent reconciliations to reduce log volume
                  - --concurrent=5
  # Configure helm-controller logging
  - target:
      kind: Deployment
      name: helm-controller
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: helm-controller
      spec:
        template:
          spec:
            containers:
              - name: manager
                args:
                  - --events-addr=http://notification-controller.flux-system.svc.cluster.local./
                  - --watch-all-namespaces=true
                  - --log-level=info
                  - --log-encoding=json
```

## Configuring Kubernetes-Level Container Log Rotation

Kubernetes nodes handle container log rotation through the kubelet. Configure these settings to manage Flux CD controller logs.

```yaml
# infrastructure/node-config/kubelet-config.yaml
# KubeletConfiguration for container log rotation
# Apply this via your node provisioning tool (e.g., EKS node groups, GKE node pools)
apiVersion: kubelet.config.k8s.io/v1beta1
kind: KubeletConfiguration
logging:
  # Use JSON format for structured logs
  format: json
# Maximum size of a container log file before rotation
containerLogMaxSize: "50Mi"
# Number of rotated log files to retain per container
containerLogMaxFiles: 5
```

```yaml
# infrastructure/node-config/containerd-config.yaml
# For clusters using containerd, configure log rotation
# This is typically set during node provisioning
#
# /etc/containerd/config.toml snippet:
# [plugins."io.containerd.grpc.v1.cri"]
#   max_container_log_line_size = 16384
```

## Deploying Fluent Bit for Log Collection and Rotation

Use Fluent Bit to collect Flux CD controller logs, apply rotation, and forward to a centralized backend.

```yaml
# infrastructure/logging/fluent-bit-helmrelease.yaml
# Deploy Fluent Bit for log collection via Flux CD
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: fluent-bit
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: fluent-bit
      version: "0.43.0"
      sourceRef:
        kind: HelmRepository
        name: fluent
        namespace: flux-system
  values:
    config:
      # Input: collect container logs from Flux CD controllers
      inputs: |
        [INPUT]
            Name              tail
            Tag               flux.*
            Path              /var/log/containers/source-controller*.log,/var/log/containers/kustomize-controller*.log,/var/log/containers/helm-controller*.log,/var/log/containers/notification-controller*.log
            Parser            cri
            DB                /var/log/flb_flux.db
            Mem_Buf_Limit     10MB
            Skip_Long_Lines   On
            Refresh_Interval  5

      # Filter: parse JSON logs from Flux controllers
      filters: |
        [FILTER]
            Name              parser
            Match             flux.*
            Key_Name          log
            Parser            json
            Reserve_Data      On

        [FILTER]
            Name              modify
            Match             flux.*
            Add               cluster production-us-east-1
            Add               source flux-cd

        [FILTER]
            Name              grep
            Match             flux.*
            Exclude           level debug

      # Output: forward to Loki for centralized storage
      outputs: |
        [OUTPUT]
            Name              loki
            Match             flux.*
            Host              loki-gateway.logging.svc.cluster.local
            Port              80
            Labels            job=flux-cd,cluster=production
            Auto_Kubernetes_Labels On
            Line_Format       json

        # Also output to local file with rotation for backup
        [OUTPUT]
            Name              file
            Match             flux.*
            Path              /var/log/flux-archived
            Format            plain
            # Rotate files when they reach 100MB
            # File rotation is handled by the File output plugin

    # Mount the log directory
    volumeMounts:
      - name: varlog
        mountPath: /var/log
      - name: containers
        mountPath: /var/lib/docker/containers
        readOnly: true

    volumes:
      - name: varlog
        hostPath:
          path: /var/log
      - name: containers
        hostPath:
          path: /var/lib/docker/containers

    # Resource limits for Fluent Bit
    resources:
      requests:
        cpu: 50m
        memory: 64Mi
      limits:
        cpu: 200m
        memory: 256Mi

    # Tolerations to run on all nodes including control plane
    tolerations:
      - operator: Exists
```

## Implementing Log Retention Policies with Loki

Configure log retention in your Loki deployment managed by Flux CD.

```yaml
# infrastructure/logging/loki-helmrelease.yaml
# Deploy Loki with log retention configuration
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: loki
  namespace: logging
spec:
  interval: 30m
  chart:
    spec:
      chart: loki
      version: "5.42.0"
      sourceRef:
        kind: HelmRepository
        name: grafana
        namespace: flux-system
  values:
    loki:
      # Configure retention policies
      limits_config:
        # Default retention period
        retention_period: 720h  # 30 days
        # Per-tenant retention (if using multi-tenancy)
        per_tenant_override_config: /etc/loki/overrides.yaml
      compactor:
        # Enable compactor for log retention enforcement
        working_directory: /data/retention
        shared_store: s3
        compaction_interval: 10m
        retention_enabled: true
        retention_delete_delay: 2h
        retention_delete_worker_count: 150
      # Schema and storage configuration
      schema_config:
        configs:
          - from: "2024-01-01"
            store: tsdb
            object_store: s3
            schema: v12
            index:
              prefix: loki_index_
              period: 24h
      storage_config:
        tsdb_shipper:
          active_index_directory: /data/tsdb-index
          cache_location: /data/tsdb-cache
        aws:
          s3: s3://us-east-1/loki-logs-bucket
```

## Cleaning Up Old Flux CD Event Logs

Flux CD stores events in Kubernetes. Set up cleanup for old events to prevent etcd bloat.

```yaml
# infrastructure/maintenance/cleanup-events.yaml
# CronJob to clean up old Flux CD events from the cluster
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cleanup-flux-events
  namespace: flux-system
spec:
  # Run every 6 hours
  schedule: "0 */6 * * *"
  concurrencyPolicy: Forbid
  jobTemplate:
    spec:
      template:
        spec:
          serviceAccountName: flux-cleanup
          containers:
            - name: cleanup
              image: bitnami/kubectl:1.28
              command:
                - /bin/sh
                - -c
                - |
                  # Delete Flux CD events older than 24 hours
                  echo "Cleaning up old Flux CD events..."
                  kubectl get events -n flux-system \
                    -o json | jq -r '
                    .items[] |
                    select(.lastTimestamp |
                      fromdateiso8601 < (now - 86400)) |
                    .metadata.name' | \
                    xargs -r -I {} kubectl delete event {} -n flux-system

                  echo "Cleanup completed at $(date -u)"
          restartPolicy: OnFailure
---
# ServiceAccount and RBAC for the cleanup job
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flux-cleanup
  namespace: flux-system
---
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: flux-event-cleaner
  namespace: flux-system
rules:
  - apiGroups: [""]
    resources: ["events"]
    verbs: ["get", "list", "delete"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: flux-event-cleaner
  namespace: flux-system
subjects:
  - kind: ServiceAccount
    name: flux-cleanup
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: flux-event-cleaner
```

## Setting Up Resource Limits for Flux Controllers

Prevent Flux CD controllers from consuming excessive resources due to log buffering.

```yaml
# clusters/production/flux-system/resource-patches.yaml
# Patch Flux controller deployments with resource limits
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization
resources:
  - gotk-components.yaml
patches:
  - target:
      kind: Deployment
      name: "(source|kustomize|helm|notification)-controller"
      namespace: flux-system
    patch: |
      apiVersion: apps/v1
      kind: Deployment
      metadata:
        name: all-controllers
      spec:
        template:
          spec:
            containers:
              - name: manager
                resources:
                  requests:
                    cpu: 100m
                    memory: 256Mi
                  limits:
                    # Cap memory to prevent OOM from log buffering
                    cpu: 500m
                    memory: 1Gi
```

## Monitoring Log Volume and Rotation Health

```yaml
# infrastructure/monitoring/log-rotation-alerts.yaml
# PrometheusRule for monitoring log volume from Flux controllers
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: flux-log-alerts
  namespace: monitoring
spec:
  groups:
    - name: flux-logging.rules
      rules:
        # Alert when Flux controller log volume is unusually high
        - alert: FluxControllerHighLogVolume
          expr: |
            sum(rate(
              container_log_usage_bytes{
                namespace="flux-system"
              }[5m]
            )) by (pod) > 1048576
          for: 15m
          labels:
            severity: warning
          annotations:
            summary: "Flux controller {{ $labels.pod }} generating excessive logs"
            description: >-
              The Flux controller {{ $labels.pod }} is generating more than
              1MB/s of logs. Consider adjusting the log level.

        # Alert when node disk space is low due to container logs
        - alert: NodeLogDiskPressure
          expr: |
            (node_filesystem_avail_bytes{mountpoint="/var/log"} /
             node_filesystem_size_bytes{mountpoint="/var/log"}) < 0.1
          for: 10m
          labels:
            severity: critical
          annotations:
            summary: "Node {{ $labels.instance }} has less than 10% log disk space"
```

## Summary

Proper log rotation for Flux CD controllers prevents disk exhaustion, reduces noise, and maintains observability. The key practices covered include:

- Configuring Flux CD controller log levels and JSON encoding for structured logging
- Setting Kubernetes-level container log rotation via kubelet configuration
- Deploying Fluent Bit for centralized log collection with filtering
- Implementing log retention policies in Loki for long-term storage
- Cleaning up old Flux CD events to prevent etcd bloat
- Setting resource limits on controllers to prevent OOM from log buffering
- Monitoring log volume with Prometheus alerting rules

By managing Flux CD controller logs through GitOps, you ensure consistent log management across all clusters while maintaining the observability needed for effective troubleshooting.
