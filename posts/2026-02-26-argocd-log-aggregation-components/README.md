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

## Option 1: Loki with Grafana Alloy

Loki is lightweight and integrates perfectly with Grafana. Deploy Grafana Alloy as a DaemonSet to tail ArgoCD logs and send them to Loki.

### Alloy Configuration

```yaml
# alloy-config.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alloy-argocd-config
  namespace: argocd
data:
  config.alloy: |
    discovery.kubernetes "argocd" {
      role = "pod"

      namespaces {
        names = ["argocd"]
      }

      selectors {
        role  = "pod"
        label = "app.kubernetes.io/part-of=argocd"
      }
    }

    discovery.relabel "argocd" {
      targets = discovery.kubernetes.argocd.targets

      rule {
        source_labels = ["__meta_kubernetes_namespace"]
        target_label  = "namespace"
      }

      rule {
        source_labels = ["__meta_kubernetes_pod_label_app_kubernetes_io_name"]
        target_label  = "component"
      }

      rule {
        source_labels = ["__meta_kubernetes_pod_name"]
        target_label  = "pod"
      }
    }

    loki.source.kubernetes "argocd" {
      targets    = discovery.relabel.argocd.output
      forward_to = [loki.process.argocd.receiver]
    }

    loki.process "argocd" {
      # Parse JSON logs
      stage.json {
        expressions = {
          level         = "level",
          msg           = "msg",
          timestamp     = "time",
          application   = "application",
          sync_status   = "sync_status",
          health_status = "health_status",
        }
      }

      # Use the log level as a label
      stage.labels {
        values = {
          level       = "",
          application = "",
        }
      }

      # Parse timestamps
      stage.timestamp {
        source = "timestamp"
        format = "RFC3339Nano"
      }

      # Drop debug logs in production
      stage.match {
        selector            = "{level=\"debug\"}"
        action              = "drop"
        drop_counter_reason = "debug_logs"
      }

      forward_to = [loki.write.default.receiver]
    }

    loki.write "default" {
      endpoint {
        url = "http://loki.observability:3100/loki/api/v1/push"
      }
    }
```

### Deploy Alloy

```yaml
apiVersion: apps/v1
kind: DaemonSet
metadata:
  name: alloy-argocd
  namespace: argocd
spec:
  selector:
    matchLabels:
      app: alloy-argocd
  template:
    metadata:
      labels:
        app: alloy-argocd
    spec:
      serviceAccountName: alloy
      containers:
        - name: alloy
          image: grafana/alloy:latest
          args:
            - run
            - /etc/alloy/config.alloy
            - --server.http.listen-addr=0.0.0.0:12345
          volumeMounts:
            - name: config
              mountPath: /etc/alloy
      volumes:
        - name: config
          configMap:
            name: alloy-argocd-config
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
      path_key log_path
      pos_file /var/log/fluentd-argocd.pos
      tag argocd.*
      <parse>
        @type regexp
        expression /^(?<time>[^ ]+) (?<stream>stdout|stderr) (?<logtag>[^ ]*) (?<log>.*)$/
        time_key time
        time_format %Y-%m-%dT%H:%M:%S.%N%z
      </parse>
    </source>

    # Parse the JSON payload emitted by ArgoCD after the Kubernetes CRI log wrapper
    <filter argocd.**>
      @type parser
      key_name log
      reserve_data true
      <parse>
        @type json
      </parse>
    </filter>

    # Add component metadata
    <filter argocd.**>
      @type record_transformer
      enable_ruby
      <record>
        cluster "#{ENV['CLUSTER_NAME']}"
        namespace argocd
        component ${record["log_path"].split("/")[-2]}
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

```text
# Sync failures
namespace: "argocd" AND component: "argocd-application-controller" AND msg: "sync failed"

# Auth events
namespace: "argocd" AND component: "argocd-server" AND msg: "authentication"

# Error-level logs across all components
namespace: "argocd" AND level: "error"
```

## Structured Log Enrichment

Add custom fields to ArgoCD logs for better searchability in the log shipper:

```yaml
# Alloy log enrichment
loki.process "argocd" {
  stage.static_labels {
    values = {
      cluster     = "production-us-east-1",
      environment = "production",
    }
  }

  forward_to = [loki.write.default.receiver]
}
```

## Log Retention and Rotation

Set appropriate retention for ArgoCD logs:

```yaml
# Loki retention config
compactor:
  retention_enabled: true
  delete_request_store: s3

limits_config:
  retention_period: 30d
  max_streams_per_user: 10000

  # Per-stream retention
  retention_stream:
    - selector: '{namespace="argocd"}'
      priority: 1
      period: 90d  # Keep ArgoCD logs longer for audit
```

## Summary

Centralized log aggregation for ArgoCD is essential for debugging sync failures, auditing access, and understanding component behavior. Use JSON log format across all components, deploy a log shipper like Alloy or Fluentd, and build queries for your most common debugging scenarios. Whether you choose Loki or Elasticsearch, the key is making ArgoCD logs searchable and correlated with metrics and traces for full observability.

For a complete observability setup, see our guide on [full observability for ArgoCD with OpenTelemetry](https://oneuptime.com/blog/post/2026-02-26-argocd-full-observability-opentelemetry/view).
