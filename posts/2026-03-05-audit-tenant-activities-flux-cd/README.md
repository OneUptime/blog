# How to Audit Tenant Activities in Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, Multi-Tenancy, Auditing, Security, Compliance

Description: Learn how to set up auditing for tenant activities in Flux CD to track deployments, configuration changes, and reconciliation events across tenants.

---

Auditing tenant activities is essential for security, compliance, and troubleshooting in multi-tenant Flux CD environments. Since Flux CD operates through GitOps, every change is tracked in Git, but you also need to monitor what happens at the Kubernetes level. This guide covers how to audit tenant activities using Flux events, Kubernetes audit logs, and notification integrations.

## Why Auditing Matters

In a multi-tenant environment, auditing helps you:

- Track which tenant made which changes and when
- Detect unauthorized resource modifications
- Comply with regulatory requirements
- Debug deployment issues across tenants
- Monitor reconciliation health per tenant

## Step 1: Enable Flux Event Logging

Flux controllers emit Kubernetes events for every reconciliation. These events are the primary source of audit data.

```bash
# View Flux events for a specific tenant namespace
kubectl get events -n team-alpha --field-selector involvedObject.kind=Kustomization

# View events across all namespaces
kubectl get events --all-namespaces --field-selector reason=ReconciliationSucceeded

# View recent events with timestamps
kubectl get events -n team-alpha --sort-by=.metadata.creationTimestamp
```

## Step 2: Configure Notification Alerts for Auditing

Set up Flux notifications to send audit events to an external system. This creates a persistent audit trail outside the cluster.

```yaml
# infrastructure/audit/notification-provider.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: audit-webhook
  namespace: flux-system
spec:
  type: generic
  address: https://audit.example.com/flux-events
  secretRef:
    name: audit-webhook-secret
```

Create an Alert that captures events from all tenant Kustomizations.

```yaml
# infrastructure/audit/audit-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: tenant-audit
  namespace: flux-system
spec:
  providerRef:
    name: audit-webhook
  # Capture all severity levels for complete auditing
  eventSeverity: info
  eventSources:
    # Monitor all Kustomizations across namespaces
    - kind: Kustomization
      name: "*"
      namespace: team-alpha
    - kind: Kustomization
      name: "*"
      namespace: team-beta
    # Monitor source changes
    - kind: GitRepository
      name: "*"
      namespace: team-alpha
    - kind: GitRepository
      name: "*"
      namespace: team-beta
```

## Step 3: Set Up Per-Tenant Audit Alerts

Create separate audit alerts for each tenant so events are routed to the right team.

```yaml
# tenants/team-alpha/audit-alert.yaml
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Provider
metadata:
  name: team-alpha-audit
  namespace: team-alpha
spec:
  type: slack
  channel: team-alpha-audit-log
  secretRef:
    name: team-alpha-slack-webhook
---
apiVersion: notification.toolkit.fluxcd.io/v1
kind: Alert
metadata:
  name: team-alpha-audit
  namespace: team-alpha
spec:
  providerRef:
    name: team-alpha-audit
  eventSeverity: info
  eventSources:
    - kind: Kustomization
      name: "*"
    - kind: HelmRelease
      name: "*"
    - kind: GitRepository
      name: "*"
```

## Step 4: Enable Kubernetes Audit Logging

Configure Kubernetes API server audit logging to capture all API calls made by tenant service accounts.

```yaml
# audit-policy.yaml for the Kubernetes API server
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all actions by Flux service accounts at the RequestResponse level
  - level: RequestResponse
    users:
      - "system:serviceaccount:team-alpha:team-alpha"
      - "system:serviceaccount:team-beta:team-beta"
    resources:
      - group: ""
        resources: ["pods", "services", "configmaps", "secrets"]
      - group: "apps"
        resources: ["deployments", "statefulsets"]
  # Log namespace creation and deletion
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["namespaces"]
    verbs: ["create", "delete"]
  # Log RBAC changes
  - level: RequestResponse
    resources:
      - group: "rbac.authorization.k8s.io"
        resources: ["roles", "rolebindings", "clusterroles", "clusterrolebindings"]
  # Log Flux CRD changes
  - level: Metadata
    resources:
      - group: "kustomize.toolkit.fluxcd.io"
      - group: "source.toolkit.fluxcd.io"
      - group: "helm.toolkit.fluxcd.io"
```

## Step 5: Query Audit Data with Flux CLI

Use the Flux CLI to inspect reconciliation history for specific tenants.

```bash
# Get all Flux resources and their status for a tenant
flux get all -n team-alpha

# Check reconciliation events for a specific Kustomization
flux events --for Kustomization/team-alpha-apps -n team-alpha

# Check the last applied revision (Git commit)
flux get kustomizations -n team-alpha -o wide
```

## Step 6: Track Git Commit Metadata

Flux includes the Git commit hash in reconciliation events. Use this to trace a deployment back to the exact code change.

```bash
# Get the current applied revision for each tenant
flux get sources git -n team-alpha

# Example output:
# NAME              REVISION           SUSPENDED  READY
# team-alpha-apps   main@sha1:abc123f  False      True
```

Cross-reference the commit hash with your Git provider to see who made the change and what was modified.

```bash
# Look up the commit in Git
git log --format="%H %an %s" abc123f -1
```

## Step 7: Set Up Audit Log Aggregation

Send Flux controller logs to a centralized logging system for long-term retention and analysis.

```yaml
# infrastructure/logging/flux-log-collector.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-flux-config
  namespace: logging
data:
  flux-controllers.conf: |
    [INPUT]
        Name              tail
        Tag               flux.*
        Path              /var/log/containers/kustomize-controller*.log
        Path              /var/log/containers/source-controller*.log
        Path              /var/log/containers/helm-controller*.log
        Parser            docker
        Refresh_Interval  5
    [OUTPUT]
        Name              es
        Match             flux.*
        Host              elasticsearch.logging.svc
        Port              9200
        Index             flux-audit
        Type              _doc
```

## Step 8: Create Audit Reports

Use the collected audit data to generate reports on tenant activity.

```bash
# Count reconciliations per tenant in the last 24 hours
kubectl get events --all-namespaces \
  --field-selector reason=ReconciliationSucceeded \
  --sort-by=.metadata.creationTimestamp | \
  awk '{print $1}' | sort | uniq -c | sort -rn

# Find failed reconciliations across all tenants
kubectl get events --all-namespaces \
  --field-selector reason=ReconciliationFailed \
  --sort-by=.metadata.creationTimestamp

# Check which tenants have stale reconciliations
flux get kustomizations --all-namespaces | grep -v "True"
```

## Summary

Auditing tenant activities in Flux CD involves capturing events at multiple levels: Flux reconciliation events, Kubernetes API server audit logs, and Git commit history. By combining Flux notification alerts with Kubernetes audit policies and centralized logging, platform administrators can maintain a complete audit trail of all tenant activities. This is essential for security, compliance, and operational visibility in multi-tenant environments.
