# How to Set Up Log Aggregation for ArgoCD Components

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Logging, Observability

Description: Learn how to set up centralized log aggregation for all ArgoCD components using Fluentd, Loki, and Elasticsearch for effective debugging and auditing.

---

ArgoCD consists of multiple components - the API server, application controller, repo server, Redis, Dex, and notifications controller. Each generates logs with different formats and verbosity levels. When something goes wrong with a sync or an application health check, you need to find the relevant logs fast. Without centralized log aggregation, you are stuck running `kubectl logs` across multiple pods and hoping you find the needle in the haystack.

This guide covers setting up log aggregation for all ArgoCD components, with practical configurations for popular logging stacks.

## ArgoCD Component Log Overview

Each ArgoCD component produces different types of logs:

| Component | Log Content | Default Format |
|---|---|---|
| argocd-server | API requests, auth events, UI access | JSON |
| argocd-application-controller | Sync operations, health checks, reconciliation | JSON |
| argocd-repo-server | Manifest generation, Helm/Kustomize rendering | JSON |
| argocd-redis | Cache operations, cluster state | Redis default |
| argocd-dex-server | Authentication, OIDC flows | JSON |
| argocd-notifications-controller | Notification delivery, trigger evaluation | JSON |

## Configuring ArgoCD Log Levels

Before aggregating, tune log levels for each component. Set levels in the `argocd-cmd-params-cm` ConfigMap:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Server log level: debug, info, warn, error
  server.log.level: "info"
  # Server log format: text or json
  server.log.format: "json"

  # Controller log level
  controller.log.level: "info"
  controller.log.format: "json"

  # Repo server log level
  reposerver.log.level: "info"
  reposerver.log.format: "json"

  # Notifications controller log level
  notificationscontroller.log.level: "info"
  notificationscontroller.log.format: "json"
```

Always use JSON format for machine-parseable logs. Apply the change:

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
# Restart components to pick up new config
kubectl rollout restart deployment -n argocd \
  argocd-server argocd-repo-server argocd-notifications-controller
kubectl rollout restart statefulset -n argocd \
  argocd-application-controller
```

## Option 1: Loki with Promtail

Loki is lightweight and integrates perfectly with Grafana. Deploy Promtail as a DaemonSet to tail ArgoCD logs.

### Promtail Configuration

```yaml
# promtail-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-argocd-config
  namespace: argocd
data:
  promtail.yaml: |
    server:
      http_listen_port: 3101

    positions:
      filename: /tmp/positions.yaml

    clients:
      - url: http://loki.observability:3100/loki/api/v1/push

    scrape_configs:
      - job_name: argocd-pods
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names: [argocd]

        relabel_configs:
          # Only scrape ArgoCD pods
          - source_labels:
              - __meta_kubernetes_pod_label_app_kubernetes_io_part_of
            regex: argocd
            action: keep

          # Set the component label
          - source_labels:
              - __meta_kubernetes_pod_label_app_kubernetes_io_name
            target_label: component

          # Set the pod name
          - source_labels:
              - __meta_kubernetes_pod_name
            target_label: pod

        pipeline_stages:
          # Parse JSON logs
          - json:
              expressions:
                level: level
                msg: msg
                timestamp: time
                application: application
                sync_status: sync_status
                health_status: health_status

          # Use the log level as a label
          - labels:
              level:
              application:

          # Parse timestamps
          - timestamp:
              source: timestamp
              format: RFC3339Nano

          # Drop debug logs in production
          - match:
              selector: '{level="debug"}'
              action: drop
              drop_counter_reason: debug_logs
```

### Deploy Promtail

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: promtail-argocd
  namespace: argocd
spec:
  selector:
    matchLabels:
      app: promtail-argocd
  template:
    metadata:
      labels:
        app: promtail-argocd
    spec:
      containers:
        - name: promtail
          image: grafana/promtail:2.9.0
          args:
            - -config.file=/etc/promtail/promtail.yaml
          volumeMounts:
            - name: config
              mountPath: /etc/promtail
            - name: pods-logs
              mountPath: /var/log/pods
              readOnly: true
            - name: docker-logs
              mountPath: /var/lib/docker/containers
              readOnly: true
      volumes:
        - name: config
          configMap:
            name: promtail-argocd-config
        - name: pods-logs
          hostPath:
            path: /var/log/pods
        - name: docker-logs
          hostPath:
            path: /var/lib/docker/containers
```

## Option 2: Fluentd to Elasticsearch

For teams using the ELK stack, configure Fluentd to ship ArgoCD logs:

```yaml
# fluentd-argocd-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-argocd
  namespace: argocd
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/pods/argocd_*/*/*.log
      pos_file /var/log/fluentd-argocd.pos
      tag argocd.*
      <parse>
        @type json
        time_key time
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    # Add component metadata
    <filter argocd.**>
      @type record_transformer
      <record>
        cluster "#{ENV['CLUSTER_NAME']}"
        namespace argocd
        component ${tag_parts[1]}
      </record>
    </filter>

    # Route sync-related logs to a separate index
    <match argocd.**>
      @type elasticsearch
      host elasticsearch.observability
      port 9200
      index_name argocd-logs
      <buffer>
        @type file
        path /var/log/fluentd-buffers/argocd
        flush_interval 5s
        chunk_limit_size 5MB
        retry_max_interval 30
      </buffer>
    </match>
```

## Useful Log Queries

Once logs are aggregated, here are queries for common debugging scenarios:

### Loki (LogQL)

```logql
# Find all sync failures
{namespace="argocd", component="argocd-application-controller"}
  |= "sync failed"

# Track a specific application's sync history
{namespace="argocd", component="argocd-application-controller"}
  | json
  | application="my-app"
  | line_format "{{.msg}}"

# Authentication failures
{namespace="argocd", component="argocd-server"}
  |= "authentication failed"

# Repo server errors during manifest generation
{namespace="argocd", component="argocd-repo-server"}
  | json
  | level="error"

# Find long-running reconciliation
{namespace="argocd", component="argocd-application-controller"}
  |= "Reconciliation completed"
  | json
  | duration > 30s

# Notification delivery failures
{namespace="argocd", component="argocd-notifications-controller"}
  |= "failed to deliver"
```

### Elasticsearch (KQL)

```
# Sync failures
namespace: "argocd" AND component: "argocd-application-controller" AND msg: "sync failed"

# Auth events
namespace: "argocd" AND component: "argocd-server" AND msg: "authentication"

# Error-level logs across all components
namespace: "argocd" AND level: "error"
```

## Structured Log Enrichment

Add custom fields to ArgoCD logs for better searchability. Use an init container or sidecar:

```yaml
# Log enrichment sidecar
containers:
  - name: log-enricher
    image: fluent/fluent-bit:2.2
    volumeMounts:
      - name: shared-logs
        mountPath: /var/log/argocd
    env:
      - name: CLUSTER_NAME
        value: "production-us-east-1"
      - name: ENVIRONMENT
        value: "production"
```

## Log Retention and Rotation

Set appropriate retention for ArgoCD logs:

```yaml
# Loki retention config
limits_config:
  retention_period: 30d
  max_streams_per_user: 10000

# Per-stream retention
overrides:
  argocd:
    retention_period: 90d  # Keep ArgoCD logs longer for audit
```

## Summary

Centralized log aggregation for ArgoCD is essential for debugging sync failures, auditing access, and understanding component behavior. Use JSON log format across all components, deploy a log shipper like Promtail or Fluentd, and build queries for your most common debugging scenarios. Whether you choose Loki or Elasticsearch, the key is making ArgoCD logs searchable and correlated with metrics and traces for full observability.

For a complete observability setup, see our guide on [full observability for ArgoCD with OpenTelemetry](https://oneuptime.com/blog/post/2026-02-26-argocd-full-observability-opentelemetry/view).
