# How to Implement Audit Logging for ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Audit Logging, Compliance

Description: Learn how to configure comprehensive audit logging in ArgoCD to track who deployed what, when, and why for compliance and security requirements.

---

When an auditor asks "who deployed this change to production last Tuesday at 3 AM?", you need a clear answer. ArgoCD provides several layers of audit capability, but getting comprehensive audit logging requires thoughtful configuration. In this guide, I will walk you through setting up audit logging that satisfies compliance requirements while being practically useful for debugging and incident response.

## What ArgoCD Logs by Default

ArgoCD captures several types of events automatically. The API server logs all API requests including authentication details. The application controller logs sync operations, health checks, and reconciliation events. The repo server logs repository access and manifest generation.

However, the default logging is focused on operational concerns rather than audit trails. To build a proper audit system, you need to configure additional logging and forward it to a centralized system.

## Configuring ArgoCD Server Audit Logs

Enable detailed audit logging in the ArgoCD API server by modifying the argocd-cmd-params-cm ConfigMap.

```yaml
# argocd-cmd-params-cm.yaml

apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Keep API responses compressed
  server.enable.gzip: "true"
  # Set log level to capture all operations
  server.log.level: "info"
  # Use structured logs for collection and querying
  server.log.format: "json"
```

For the application controller, set similar parameters.

```yaml
data:
  controller.log.level: "info"
  controller.log.format: "json"
```

JSON format is essential for audit logs because it makes them parseable by log aggregation systems like Elasticsearch, Loki, or Splunk.

## Capturing Sync Events

ArgoCD emits Kubernetes Events for application activity, and sync operations can also be captured through notifications. Configure ArgoCD notifications to log sync events to a dedicated audit channel.

```yaml
# argocd-notifications-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  # Audit webhook service
  service.webhook.audit-log: |
    url: https://audit.mycompany.com/api/events
    headers:
      - name: Authorization
        value: Bearer $audit-api-token
      - name: Content-Type
        value: application/json

  # Detailed audit template
  template.audit-sync-event: |
    webhook:
      audit-log:
        method: POST
        body: |
          {
            "event_type": "deployment",
            "timestamp": "{{.app.status.operationState.finishedAt}}",
            "application": "{{.app.metadata.name}}",
            "namespace": "{{.app.spec.destination.namespace}}",
            "cluster": "{{.app.spec.destination.server}}",
            "project": "{{.app.spec.project}}",
            "sync_status": "{{.app.status.operationState.phase}}",
            "revision": "{{.app.status.operationState.syncResult.revision}}",
            "initiated_by": "{{.app.status.operationState.operation.initiatedBy.username}}",
            "automated": "{{.app.status.operationState.operation.initiatedBy.automated}}",
            "source_repo": "{{.app.spec.source.repoURL}}",
            "source_path": "{{.app.spec.source.path}}",
            "resources_synced": {{.app.status.operationState.syncResult.resources | toJson}}
          }

  # Triggers for all sync events
  trigger.on-sync-running: |
    - when: app.status?.operationState.phase in ['Running']
      send: [audit-sync-event]
  trigger.on-sync-succeeded: |
    - when: app.status?.operationState.phase in ['Succeeded']
      send: [audit-sync-event]
  trigger.on-sync-failed: |
    - when: app.status?.operationState.phase in ['Error', 'Failed']
      send: [audit-sync-event]
```

Add a matching notification subscription to each Application, AppProject, or global subscription so the webhook is actually invoked for these triggers.

## Kubernetes Audit Logging Integration

ArgoCD operations go through the Kubernetes API server, which has its own audit logging. Configure the Kubernetes audit policy to capture ArgoCD-related events.

```yaml
# k8s-audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all changes made by ArgoCD service accounts
  - level: RequestResponse
    users:
      - system:serviceaccount:argocd:argocd-application-controller
      - system:serviceaccount:argocd:argocd-server
    verbs:
      - create
      - update
      - patch
      - delete
    resources:
      - group: ""
        resources: ["*"]
      - group: apps
        resources: ["*"]
      - group: networking.k8s.io
        resources: ["*"]
  # Log ArgoCD Application changes at metadata level
  - level: Metadata
    resources:
      - group: argoproj.io
        resources: ["applications", "appprojects"]
    verbs:
      - create
      - update
      - patch
      - delete
```

## Forwarding Logs to a SIEM

Use a log collector like Fluentd or Vector to forward ArgoCD logs to your SIEM system.

```yaml
# vector-config.yaml (deployed via ArgoCD)
apiVersion: v1
kind: ConfigMap
metadata:
  name: vector-config
data:
  vector.toml: |
    [sources.argocd_logs]
    type = "kubernetes_logs"
    extra_label_selector = "app.kubernetes.io/part-of=argocd"

    [transforms.parse_argocd]
    type = "remap"
    inputs = ["argocd_logs"]
    source = '''
    parsed = object!(parse_json!(.message))
    . = merge(., parsed)
    .source = "argocd"
    .cluster = "production-us-east-1"
    '''

    [transforms.filter_audit_events]
    type = "filter"
    inputs = ["parse_argocd"]
    condition = '''
    match_any(to_string(.msg) ?? "", [r'sync', r'create', r'update', r'delete', r'login', r'logout'])
    '''

    [sinks.elasticsearch]
    type = "elasticsearch"
    inputs = ["filter_audit_events"]
    endpoints = ["https://elasticsearch.mycompany.com:9200"]
    bulk.index = "argocd-audit-%Y-%m-%d"
```

## Tracking User Actions in the ArgoCD UI

ArgoCD records application activity as Kubernetes Events, and API server logs include most non-sensitive API requests. Every time someone clicks "Sync" or "Rollback" in the UI, those events can be correlated with the authenticated user identity when it is available.

To make this work properly, ensure you have SSO configured so that actions are tied to real user identities rather than a shared admin account. See our guide on [configuring SSO with OIDC in ArgoCD](https://oneuptime.com/blog/post/2026-01-25-sso-oidc-argocd/view) for setup instructions.

```bash
# View recent sync history for an application
argocd app history my-application

# Output includes:
# ID  DATE                           REVISION
# 1   2026-02-15 10:30:00 +0000 UTC  abc1234 (main)
# 2   2026-02-16 14:15:00 +0000 UTC  def5678 (main)
# 3   2026-02-20 09:45:00 +0000 UTC  ghi9012 (main)
```

## Git History as an Audit Trail

One of the biggest advantages of GitOps is that Git itself serves as an audit trail. Every change that ArgoCD deploys comes from a Git commit, which includes who made the change, when, and the commit message explaining why.

Enforce meaningful commit messages and require pull request reviews for your GitOps repositories.

```yaml
# Branch protection rules (GitHub)
# Require pull request reviews before merging
# Require signed commits
# Require status checks to pass
```

This creates a two-layer audit trail: Git shows what was intended to change, and ArgoCD logs show what actually changed in the cluster.

## Building an Audit Dashboard

Create a Grafana dashboard that visualizes your audit data.

```yaml
# grafana-dashboard ConfigMap (deployed via ArgoCD)
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-audit-dashboard
  labels:
    grafana_dashboard: "1"
data:
  argocd-audit.json: |
    {
      "dashboard": {
        "title": "ArgoCD Audit Trail",
        "panels": [
          {
            "title": "Deployments Over Time",
            "type": "timeseries",
            "targets": [
              {
                "expr": "sum(rate(argocd_app_sync_total[1h])) by (name, project)"
              }
            ]
          },
          {
            "title": "Sync Failures",
            "type": "table",
            "targets": [
              {
                "expr": "argocd_app_sync_total{phase='Error'}"
              }
            ]
          },
          {
            "title": "Deployments by Project",
            "type": "piechart",
            "targets": [
              {
                "expr": "sum(argocd_app_sync_total) by (project)"
              }
            ]
          }
        ]
      }
    }
```

## Retention and Compliance

For compliance frameworks like SOC 2, PCI-DSS, or HIPAA, you typically need to retain audit evidence for defined periods. Configure your log storage according to your regulatory scope and written policies.

- SOC 2: Align log retention with your organization's control commitments and audit period
- PCI-DSS: Retain audit log history for at least 12 months, with the most recent 3 months immediately available for analysis
- HIPAA: Retain required compliance documentation for 6 years; set technical log retention with your compliance and legal teams based on what the logs contain and how they support required reviews

Set up log lifecycle policies in your storage system to automatically archive old logs to cold storage and delete them after the retention period.

## Conclusion

Comprehensive audit logging in ArgoCD requires combining multiple data sources: ArgoCD's own event logs, Kubernetes audit logs, Git commit history, and ArgoCD notifications. By forwarding all of these to a centralized SIEM and building dashboards on top, you get a complete picture of every change in your cluster. This not only satisfies compliance requirements but also makes incident investigation significantly faster when something goes wrong in production.
