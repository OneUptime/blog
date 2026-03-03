# How to Audit API Calls in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Auditing

Description: Learn how to configure comprehensive API audit logging in ArgoCD to track who did what, when, and why for compliance and security monitoring.

---

When something goes wrong in production, the first question is always "who changed what?" ArgoCD's API audit logging gives you the answer. Whether you need audit trails for compliance, security monitoring, or incident investigation, this guide covers how to capture, store, and analyze ArgoCD API activity.

## What Gets Audited

ArgoCD logs API activity at the server level. Every request to the API server is logged, including:

- Authentication events (login, logout, failed attempts)
- Application operations (create, update, delete, sync)
- Repository management (add, update, remove)
- Project modifications
- Cluster management operations
- RBAC changes
- Settings modifications

## Enabling Detailed Audit Logging

First, configure the ArgoCD server to log in JSON format with sufficient detail:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable JSON logging for machine-parseable audit trails
  server.log.format: "json"
  # Set log level to info to capture all API calls
  server.log.level: "info"
  # Also configure the controller and repo server
  controller.log.format: "json"
  controller.log.level: "info"
  reposerver.log.format: "json"
  reposerver.log.level: "info"
```

Apply and restart:

```bash
kubectl apply -f argocd-cmd-params-cm.yaml
kubectl rollout restart deployment argocd-server -n argocd
```

## Understanding ArgoCD Audit Log Format

ArgoCD API logs contain structured information about each request. Here is what a typical log entry looks like:

```json
{
  "level": "info",
  "msg": "finished unary call with code OK",
  "grpc.method": "Get",
  "grpc.service": "application.ApplicationService",
  "grpc.code": "OK",
  "grpc.time_ms": 12.5,
  "caller": "grpc_zap/server_interceptors.go:42",
  "user": "admin",
  "ip": "10.0.1.50"
}
```

For sync operations:

```json
{
  "level": "info",
  "msg": "sync operation started",
  "application": "my-app",
  "project": "default",
  "user": "developer@example.com",
  "revision": "abc1234",
  "sync_strategy": "apply"
}
```

## Forwarding Audit Logs to External Systems

### Using Fluentd

Deploy Fluentd as a sidecar or use a cluster-level Fluentd DaemonSet to collect ArgoCD logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluentd-argocd-config
  namespace: argocd
data:
  fluent.conf: |
    <source>
      @type tail
      path /var/log/containers/argocd-server-*.log
      pos_file /var/log/fluentd/argocd-server.pos
      tag argocd.server
      <parse>
        @type json
        time_key time
        time_format %Y-%m-%dT%H:%M:%S.%NZ
      </parse>
    </source>

    # Filter for API audit events only
    <filter argocd.server>
      @type grep
      <regexp>
        key log
        pattern /grpc\.method|sync|login|create|update|delete/
      </regexp>
    </filter>

    # Forward to Elasticsearch
    <match argocd.**>
      @type elasticsearch
      host elasticsearch.logging.svc.cluster.local
      port 9200
      index_name argocd-audit-%Y.%m.%d
      <buffer>
        @type file
        path /var/log/fluentd/buffer/argocd
        flush_interval 10s
      </buffer>
    </match>
```

### Using Promtail/Loki

If you use the Grafana stack, configure Promtail to collect ArgoCD logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: promtail-config
  namespace: monitoring
data:
  promtail.yaml: |
    server:
      http_listen_port: 3101
    positions:
      filename: /tmp/positions.yaml
    clients:
      - url: http://loki:3100/loki/api/v1/push
    scrape_configs:
      - job_name: argocd-audit
        kubernetes_sd_configs:
          - role: pod
            namespaces:
              names:
                - argocd
        relabel_configs:
          - source_labels:
              - __meta_kubernetes_pod_label_app_kubernetes_io_name
            regex: argocd-server
            action: keep
          - source_labels:
              - __meta_kubernetes_namespace
            target_label: namespace
          - source_labels:
              - __meta_kubernetes_pod_name
            target_label: pod
        pipeline_stages:
          - json:
              expressions:
                user: user
                method: grpc.method
                service: grpc.service
                code: grpc.code
          - labels:
              user:
              method:
              service:
              code:
```

## Kubernetes Audit Logging for ArgoCD

Beyond ArgoCD's own logs, enable Kubernetes audit logging to track ArgoCD's interactions with the Kubernetes API:

```yaml
apiVersion: audit.k8s.io/v1
kind: Policy
metadata:
  name: argocd-audit-policy
rules:
  # Log all ArgoCD service account activity
  - level: RequestResponse
    users:
      - system:serviceaccount:argocd:argocd-application-controller
      - system:serviceaccount:argocd:argocd-server
    resources:
      - group: ""
        resources: ["*"]
      - group: "apps"
        resources: ["*"]
      - group: "argoproj.io"
        resources: ["*"]

  # Log all modifications to the argocd namespace
  - level: RequestResponse
    namespaces: ["argocd"]
    verbs: ["create", "update", "patch", "delete"]

  # Log all CRD modifications by ArgoCD
  - level: Metadata
    resources:
      - group: "argoproj.io"
        resources: ["applications", "appprojects", "applicationsets"]
```

## Building Audit Dashboards

### Grafana Dashboard for ArgoCD Audit Logs

If you use Loki, create a Grafana dashboard to visualize audit activity:

```text
# Loki queries for ArgoCD audit dashboard

# All sync operations
{namespace="argocd", pod=~"argocd-server.*"} |= "sync"

# Failed login attempts
{namespace="argocd", pod=~"argocd-server.*"} |= "login" |= "failed"

# Application deletions
{namespace="argocd", pod=~"argocd-server.*"} |= "delete" |= "application"

# All write operations by user
{namespace="argocd", pod=~"argocd-server.*"} | json | method=~"Create|Update|Delete|Sync"
```

### Useful Log Queries

```bash
# Find all sync operations in the last hour
kubectl logs deployment/argocd-server -n argocd --since=1h | \
  jq 'select(.msg | test("sync"; "i"))'

# Find all failed login attempts
kubectl logs deployment/argocd-server -n argocd --since=24h | \
  jq 'select(.msg | test("login.*fail|authentication.*fail"; "i"))'

# Find all application deletions
kubectl logs deployment/argocd-server -n argocd --since=24h | \
  jq 'select(.grpc_method == "Delete" and .grpc_service == "application.ApplicationService")'

# Find all operations by a specific user
kubectl logs deployment/argocd-server -n argocd --since=24h | \
  jq 'select(.user == "developer@example.com")'
```

## ArgoCD Notifications for Audit Events

Use ArgoCD Notifications to send real-time alerts for important audit events:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [audit-sync-succeeded]

  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Error', 'Failed']
      send: [audit-sync-failed]

  trigger.on-deleted: |
    - when: app.metadata.deletionTimestamp != nil
      send: [audit-app-deleted]

  template.audit-sync-succeeded: |
    message: |
      Application {{.app.metadata.name}} synced successfully.
      User: {{.app.status.operationState.operation.initiatedBy.username}}
      Revision: {{.app.status.sync.revision}}
      Time: {{.app.status.operationState.finishedAt}}

  template.audit-sync-failed: |
    message: |
      Application {{.app.metadata.name}} sync FAILED.
      User: {{.app.status.operationState.operation.initiatedBy.username}}
      Error: {{.app.status.operationState.message}}

  template.audit-app-deleted: |
    message: |
      Application {{.app.metadata.name}} was DELETED.
```

## Compliance Reporting

For SOC2, PCI-DSS, or other compliance frameworks, generate periodic audit reports:

```bash
#!/bin/bash
# Generate weekly ArgoCD audit report

REPORT_FILE="argocd-audit-$(date +%Y-%m-%d).txt"
echo "ArgoCD Audit Report - $(date)" > $REPORT_FILE
echo "================================" >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "=== Login Activity ===" >> $REPORT_FILE
kubectl logs deployment/argocd-server -n argocd --since=168h | \
  jq -r 'select(.msg | test("session"; "i")) | "\(.time) - \(.user // "unknown") - \(.msg)"' >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "=== Sync Operations ===" >> $REPORT_FILE
kubectl logs deployment/argocd-server -n argocd --since=168h | \
  jq -r 'select(.msg | test("sync"; "i")) | "\(.time) - \(.user // "system") - \(.msg)"' >> $REPORT_FILE

echo "" >> $REPORT_FILE
echo "=== Application Changes ===" >> $REPORT_FILE
kubectl logs deployment/argocd-server -n argocd --since=168h | \
  jq -r 'select(.grpc_method | test("Create|Update|Delete"; "i") // false) | "\(.time) - \(.user // "unknown") - \(.grpc_method) \(.grpc_service)"' >> $REPORT_FILE

echo "Report saved to $REPORT_FILE"
```

## Conclusion

Audit logging in ArgoCD is essential for security, compliance, and operational visibility. Start by enabling JSON logging and forwarding to a centralized system like Elasticsearch or Loki. Build dashboards to visualize activity patterns and set up alerts for suspicious behavior. For compliance, combine ArgoCD's own audit logs with Kubernetes audit logs to get a complete picture of who changed what in your deployment pipeline.

For related topics, see our guide on [configuring ArgoCD for SOC2 compliance](https://oneuptime.com/blog/post/2026-02-26-argocd-soc2-compliance/view).
