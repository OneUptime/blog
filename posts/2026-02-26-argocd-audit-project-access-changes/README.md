# How to Audit Project Access and Changes in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Security, Auditing

Description: Learn how to audit ArgoCD project access, track configuration changes, monitor deployment activity, and build a comprehensive audit trail for compliance and security requirements.

---

For organizations with compliance requirements or simply a need to understand who changed what and when, auditing ArgoCD activity is essential. ArgoCD provides several mechanisms for tracking changes to projects, applications, and access patterns. This guide covers how to build a comprehensive audit trail for your ArgoCD environment.

## What to Audit

A complete ArgoCD audit trail should capture:

- **Authentication events**: Who logged in and when
- **Authorization decisions**: What was allowed or denied
- **Application changes**: Creates, updates, deletes, and syncs
- **Project changes**: Modifications to project settings (sources, destinations, roles)
- **Configuration changes**: Changes to RBAC policies, SSO settings, repository credentials
- **Deployment activity**: What was deployed, to which cluster, and by whom

## ArgoCD Server Audit Logs

The ArgoCD API server logs every API request, including the user, action, and result.

### Enabling Detailed Logging

Increase the log level for more detailed audit information:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  # Enable debug logging for detailed audit
  server.log.level: info

  # Enable gRPC access logs
  server.log.format: json
```

### Reading Audit Logs

```bash
# View API server logs
kubectl logs -n argocd deployment/argocd-server -f

# Filter for specific events
# Application syncs
kubectl logs -n argocd deployment/argocd-server | grep "sync"

# Authentication events
kubectl logs -n argocd deployment/argocd-server | grep "authentication\|login"

# Project modifications
kubectl logs -n argocd deployment/argocd-server | grep "project\|AppProject"

# Failed authorization attempts
kubectl logs -n argocd deployment/argocd-server | grep "permission denied\|unauthorized"
```

### Structured Log Queries

With JSON logging enabled, use jq for precise queries:

```bash
# Get all sync events with user information
kubectl logs -n argocd deployment/argocd-server --since=24h | \
  grep -o '{.*}' | jq 'select(.msg | contains("sync"))'

# Get all project modification events
kubectl logs -n argocd deployment/argocd-server --since=24h | \
  grep -o '{.*}' | jq 'select(.msg | contains("project"))'
```

## Kubernetes Audit Logs

For the most comprehensive audit trail, enable Kubernetes audit logging which captures all API operations on ArgoCD resources.

### Audit Policy for ArgoCD Resources

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all changes to ArgoCD Applications
  - level: RequestResponse
    resources:
      - group: argoproj.io
        resources:
          - applications
          - applicationsets
          - appprojects
    verbs:
      - create
      - update
      - patch
      - delete

  # Log changes to ArgoCD secrets (repo credentials)
  - level: Metadata
    resources:
      - group: ""
        resources:
          - secrets
    namespaces:
      - argocd
    verbs:
      - create
      - update
      - delete

  # Log changes to ArgoCD ConfigMaps (RBAC, notifications)
  - level: RequestResponse
    resources:
      - group: ""
        resources:
          - configmaps
    namespaces:
      - argocd
    verbs:
      - update
      - patch
```

This captures:
- Who created, modified, or deleted applications
- Who changed project settings
- Who modified RBAC policies
- Who updated repository credentials

## Git-Based Audit Trail

Since ArgoCD projects should be managed declaratively through Git, your Git history is the primary audit trail for configuration changes.

### Tracking Project Changes in Git

```bash
# View the Git history for project configurations
git log --oneline -- projects/

# View detailed diffs for a specific project
git log -p -- projects/backend-project.yaml

# See who made changes and when
git log --format="%h %ai %an - %s" -- projects/

# View changes in the last 30 days
git log --since="30 days ago" --oneline -- projects/
```

### Using Git Blame for Current State

```bash
# See who last modified each line of a project config
git blame projects/backend-project.yaml
```

### Enforcing Change Tracking

Use branch protection rules to ensure all project changes go through pull requests:

```yaml
# GitHub branch protection
# Settings > Branches > Branch protection rules
# - Require pull request reviews before merging
# - Require review from CODEOWNERS
# - Require status checks to pass
```

Create a CODEOWNERS file:

```text
# .github/CODEOWNERS
# ArgoCD project configs require platform team approval
projects/ @my-org/platform-team
argocd-rbac-cm.yaml @my-org/security-team
```

## ArgoCD Event Notifications for Audit

Configure ArgoCD notifications to create an audit stream:

### Webhook to Audit Logging System

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  service.webhook.audit: |
    url: https://audit-system.example.com/argocd/events
    headers:
      - name: Authorization
        value: Bearer $audit-token
      - name: Content-Type
        value: application/json

  template.audit-event: |
    webhook:
      audit:
        method: POST
        body: |
          {
            "timestamp": "{{.app.status.operationState.finishedAt}}",
            "application": "{{.app.metadata.name}}",
            "project": "{{.app.spec.project}}",
            "action": "{{.app.status.operationState.phase}}",
            "initiatedBy": "{{.app.status.operationState.operation.initiatedBy.username}}",
            "revision": "{{.app.status.sync.revision}}",
            "destination": "{{.app.spec.destination.server}}/{{.app.spec.destination.namespace}}",
            "syncStatus": "{{.app.status.sync.status}}",
            "healthStatus": "{{.app.status.health.status}}"
          }

  trigger.on-sync-succeeded: |
    - when: app.status.operationState.phase in ['Succeeded']
      send: [audit-event]

  trigger.on-sync-failed: |
    - when: app.status.operationState.phase in ['Failed', 'Error']
      send: [audit-event]

  trigger.on-created: |
    - when: "true"
      oncePer: app.metadata.uid
      send: [audit-event]
```

### Slack Audit Channel

```yaml
data:
  service.slack: |
    token: $slack-token

  template.audit-slack: |
    slack:
      attachments: |
        [{
          "title": "ArgoCD Audit Event: {{.app.metadata.name}}",
          "color": "{{if eq .app.status.sync.status \"Synced\"}}#18be52{{else}}#E96D76{{end}}",
          "fields": [
            {"title": "Project", "value": "{{.app.spec.project}}", "short": true},
            {"title": "Action", "value": "{{.app.status.operationState.phase}}", "short": true},
            {"title": "User", "value": "{{.app.status.operationState.operation.initiatedBy.username}}", "short": true},
            {"title": "Revision", "value": "{{.app.status.sync.revision | trunc 7}}", "short": true},
            {"title": "Destination", "value": "{{.app.spec.destination.namespace}}", "short": true},
            {"title": "Timestamp", "value": "{{.app.status.operationState.finishedAt}}", "short": true}
          ]
        }]

  trigger.on-any-change: |
    - when: "true"
      send: [audit-slack]
```

## Prometheus Metrics for Audit

ArgoCD exports metrics that can be used for audit monitoring:

### Useful Audit Metrics

```promql
# Sync operations over time (who triggered syncs)
rate(argocd_app_sync_total[1h])

# Sync operations by project
sum by (project) (increase(argocd_app_sync_total[24h]))

# Failed sync attempts
argocd_app_sync_total{phase="Failed"}

# Application count changes over time
argocd_app_info
```

### Alerting on Suspicious Activity

```yaml
# Prometheus alert rules
groups:
  - name: argocd-audit-alerts
    rules:
      # Alert on unusual number of syncs
      - alert: UnusualSyncActivity
        expr: increase(argocd_app_sync_total[1h]) > 20
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Unusual ArgoCD sync activity detected"

      # Alert on after-hours deployments
      - alert: AfterHoursDeployment
        expr: argocd_app_sync_total and ON() hour() > 22 or hour() < 6
        labels:
          severity: info
        annotations:
          summary: "ArgoCD deployment outside business hours"
```

## Querying the Audit Trail

### Who Synced What in the Last 24 Hours

```bash
# Using ArgoCD CLI
argocd app list -o json | jq '.items[] | {
  name: .metadata.name,
  project: .spec.project,
  lastSync: .status.operationState.finishedAt,
  syncedBy: .status.operationState.operation.initiatedBy.username,
  revision: .status.sync.revision[0:7]
}' | jq 'select(.lastSync > (now - 86400 | todate))'
```

### What Changed in a Specific Project

```bash
# Application sync history for a project
for APP in $(argocd app list --project backend -o name); do
  APP_NAME=$(echo $APP | cut -d'/' -f2)
  echo "=== $APP_NAME ==="
  argocd app history $APP_NAME | head -5
  echo ""
done
```

### Track Project Configuration Changes

```bash
# Using kubectl to see recent changes to AppProjects
kubectl get events -n argocd --field-selector involvedObject.kind=AppProject

# Using kubectl audit logs (if configured)
# Filter for AppProject changes
kubectl logs -n kube-system -l component=kube-apiserver | \
  grep "appprojects"
```

## Building a Compliance Report

For compliance audits, combine data from multiple sources:

```bash
#!/bin/bash
# compliance-report.sh <project> <start-date> <end-date>

PROJECT=$1
START=$2
END=$3

echo "=== ArgoCD Compliance Report ==="
echo "Project: $PROJECT"
echo "Period: $START to $END"
echo ""

echo "=== 1. Current Applications ==="
argocd app list --project $PROJECT -o wide
echo ""

echo "=== 2. Application Sync History ==="
for APP in $(argocd app list --project $PROJECT -o name); do
  APP_NAME=$(echo $APP | cut -d'/' -f2)
  echo "--- $APP_NAME ---"
  argocd app history $APP_NAME
  echo ""
done

echo "=== 3. Project Configuration ==="
argocd proj get $PROJECT -o yaml
echo ""

echo "=== 4. Git Change Log ==="
git log --since="$START" --until="$END" --format="%h %ai %an - %s" -- "projects/${PROJECT}*"
echo ""

echo "=== 5. RBAC Policies ==="
kubectl get configmap argocd-rbac-cm -n argocd -o yaml | grep "$PROJECT"
echo ""

echo "=== Report generated: $(date) ==="
```

## Retention and Storage

### Shipping Logs to External Systems

Use Fluentd, Fluent Bit, or another log collector to ship ArgoCD logs to a central logging system:

```yaml
# Fluent Bit configuration for ArgoCD audit logs
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-config
data:
  fluent-bit.conf: |
    [INPUT]
        Name              tail
        Path              /var/log/containers/argocd-server-*.log
        Parser            json
        Tag               argocd.server

    [FILTER]
        Name    grep
        Match   argocd.*
        Regex   msg (sync|project|login|permission|create|update|delete)

    [OUTPUT]
        Name              elasticsearch
        Match             argocd.*
        Host              elasticsearch.logging.svc
        Index             argocd-audit
        Type              _doc
```

### Retention Policy

Set appropriate retention for audit data:

- **Short-term (30 days)**: Detailed application logs in Kubernetes
- **Medium-term (1 year)**: Aggregated audit events in your SIEM or logging system
- **Long-term (7+ years)**: Git history (projects as code) and compliance reports

## Summary

A comprehensive ArgoCD audit trail combines multiple data sources: ArgoCD server logs for real-time events, Kubernetes audit logs for API-level tracking, Git history for configuration changes, notifications for event streaming, and Prometheus metrics for trend analysis. For compliance, ensure all project configurations are managed in Git with pull request reviews, ship ArgoCD logs to a central logging system with appropriate retention, and build automated compliance reports that combine data from all sources. The Git-based approach to managing projects gives you the strongest audit trail because every change is attributed to a specific person and commit.
