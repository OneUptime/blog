# How to Audit RBAC Changes in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, RBAC, Auditing

Description: Learn how to track, audit, and monitor RBAC policy changes in ArgoCD using Kubernetes audit logs, Git history, notifications, and monitoring tools.

---

When something goes wrong with ArgoCD access control - a user gets unexpected permissions, a deployment pipeline breaks, or an unauthorized sync happens - the first question is always "who changed the RBAC policy and when?" Auditing RBAC changes is critical for security compliance, incident investigation, and general operational hygiene.

This guide covers multiple approaches to tracking RBAC changes in ArgoCD.

## Why Audit RBAC Changes

RBAC changes can have immediate and wide-reaching effects:

- A new allow rule might give a team access to production they should not have
- A deleted group mapping might break CI/CD pipelines
- A changed default policy might lock out all non-admin users
- A deny rule addition might prevent critical deployments

Without audit trails, you cannot answer questions like:
- Who changed the RBAC policy?
- What was the policy before the change?
- When did the change happen?
- What is the impact of the change?

## Method 1: Git-Based Auditing (Recommended)

The most reliable way to audit RBAC changes is to manage your ArgoCD configuration through Git. Every change becomes a commit with an author, timestamp, and diff.

Store your RBAC ConfigMap in a Git repository:

```yaml
# argocd-config/argocd-rbac-cm.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-rbac-cm
  namespace: argocd
data:
  policy.csv: |
    p, role:deployer, applications, get, */*, allow
    p, role:deployer, applications, sync, */*, allow
    g, developers, role:deployer
    g, platform-admins, role:admin
  policy.default: role:readonly
```

Deploy it using ArgoCD (yes, ArgoCD managing its own configuration):

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: argocd-rbac
  namespace: argocd
spec:
  project: default
  source:
    repoURL: https://github.com/myorg/argocd-config
    targetRevision: main
    path: rbac
  destination:
    server: https://kubernetes.default.svc
    namespace: argocd
  syncPolicy:
    automated:
      selfHeal: true
```

Now every RBAC change goes through a pull request:

```bash
# View RBAC change history
git log --oneline argocd-config/argocd-rbac-cm.yaml

# See exactly what changed
git diff HEAD~1 argocd-config/argocd-rbac-cm.yaml

# Find who made a specific change
git blame argocd-config/argocd-rbac-cm.yaml
```

With self-healing enabled, any manual changes to the ConfigMap via kubectl get automatically reverted, enforcing that all changes go through Git.

## Method 2: Kubernetes Audit Logs

Kubernetes audit logging captures all API requests, including ConfigMap updates. Enable audit logging on your API server to track changes to `argocd-rbac-cm`.

Configure an audit policy:

```yaml
# audit-policy.yaml
apiVersion: audit.k8s.io/v1
kind: Policy
rules:
  # Log all changes to ConfigMaps in the argocd namespace
  - level: RequestResponse
    resources:
      - group: ""
        resources: ["configmaps"]
    namespaces: ["argocd"]
    verbs: ["create", "update", "patch", "delete"]
```

Once audit logging is configured, you can search for RBAC changes:

```bash
# Search audit logs for ConfigMap changes in argocd namespace
# (The exact command depends on where your audit logs are stored)

# If using a file-based audit backend
grep "argocd-rbac-cm" /var/log/kubernetes/audit.log | jq '.'

# If using CloudWatch (EKS)
aws logs filter-log-events \
  --log-group-name /aws/eks/cluster/audit \
  --filter-pattern "argocd-rbac-cm"
```

Audit log entries include:
- The user who made the change
- The timestamp
- The request body (new policy)
- The response (success or failure)

## Method 3: Kubernetes Event Monitoring

Watch for events related to the RBAC ConfigMap:

```bash
# Watch for ConfigMap changes in the argocd namespace
kubectl get events -n argocd --field-selector reason=Updated --watch
```

For more detailed monitoring, use a tool like Kubernetes Event Exporter to ship events to a logging system:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: event-exporter-config
data:
  config.yaml: |
    logLevel: warning
    route:
      routes:
        - match:
            - receiver: "dump"
              kind: "ConfigMap"
              namespace: "argocd"
    receivers:
      - name: "dump"
        stdout: {}
```

## Method 4: ArgoCD Server Logs

ArgoCD server logs RBAC policy reloads. When the `argocd-rbac-cm` ConfigMap changes, the server detects it and reloads the policy:

```bash
# View RBAC reload events
kubectl logs -n argocd deployment/argocd-server | grep -i "rbac"

# Look for policy reload messages
kubectl logs -n argocd deployment/argocd-server | grep "policy"
```

You should see messages like:
```
time="2024-01-15T10:00:00Z" level=info msg="RBAC policy reloaded"
```

However, server logs do not show what changed, only that a reload happened. Combine this with Git history or Kubernetes audit logs for full context.

## Method 5: Notifications on RBAC Changes

Set up notifications to alert your team when RBAC changes are detected.

### Using ArgoCD Notifications

If you manage the RBAC ConfigMap as an ArgoCD application, you can use ArgoCD notifications:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-notifications-cm
  namespace: argocd
data:
  trigger.on-sync-succeeded: |
    - when: app.metadata.name == 'argocd-rbac'
      send: [rbac-changed]

  template.rbac-changed: |
    message: |
      ArgoCD RBAC policy has been updated.
      Sync Status: {{.app.status.sync.status}}
      Commit: {{.app.status.sync.revision}}
    slack:
      attachments: |
        [{
          "title": "RBAC Policy Updated",
          "color": "#ff9800",
          "text": "The ArgoCD RBAC configuration has been synced from Git."
        }]

  service.slack: |
    token: $slack-token
```

### Using a Kubernetes Watcher

Create a simple watcher that alerts on ConfigMap changes:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: rbac-audit
  namespace: argocd
spec:
  schedule: "*/5 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: audit
              image: bitnami/kubectl:latest
              command:
                - /bin/sh
                - -c
                - |
                  CURRENT_HASH=$(kubectl get configmap argocd-rbac-cm -n argocd -o jsonpath='{.metadata.resourceVersion}')
                  STORED_HASH=$(kubectl get configmap rbac-audit-state -n argocd -o jsonpath='{.data.lastVersion}' 2>/dev/null || echo "")
                  if [ "$CURRENT_HASH" != "$STORED_HASH" ]; then
                    echo "RBAC policy changed! New version: $CURRENT_HASH"
                    # Send alert here (webhook, email, etc.)
                    kubectl create configmap rbac-audit-state -n argocd \
                      --from-literal=lastVersion=$CURRENT_HASH \
                      --dry-run=client -o yaml | kubectl apply -f -
                  fi
          restartPolicy: OnFailure
```

## Method 6: Comparing Policies Over Time

Keep snapshots of your RBAC policy at different points in time:

```bash
#!/bin/bash
# snapshot-rbac.sh - Save current RBAC policy with timestamp

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
kubectl get configmap argocd-rbac-cm -n argocd -o yaml > \
  "/var/log/argocd-rbac/rbac-snapshot-${TIMESTAMP}.yaml"

echo "RBAC snapshot saved: rbac-snapshot-${TIMESTAMP}.yaml"
```

Run this as a CronJob to create regular snapshots, then diff them to see what changed:

```bash
# Compare two snapshots
diff rbac-snapshot-20240115_100000.yaml rbac-snapshot-20240116_100000.yaml
```

## Auditing Access Patterns

Beyond policy changes, audit who is using what permissions:

```bash
# Track all sync operations
kubectl logs -n argocd deployment/argocd-server | grep "sync" | grep "applications"

# Track permission denied events
kubectl logs -n argocd deployment/argocd-server | grep "permission denied"

# Track login events
kubectl logs -n argocd deployment/argocd-server | grep "login"
```

For structured logging, configure ArgoCD to output JSON logs:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cmd-params-cm
  namespace: argocd
data:
  server.log.format: json
```

Then use tools like jq, Elasticsearch, or Datadog to query and visualize access patterns.

## Compliance Reporting

For SOC2, HIPAA, or other compliance frameworks, you need to demonstrate:

1. **Who has access** - Export current RBAC policy
2. **How access is granted** - Document the process (Git PRs, approvals)
3. **When access changed** - Git history and audit logs
4. **Why access changed** - PR descriptions and commit messages

Generate an access report:

```bash
#!/bin/bash
# generate-access-report.sh

echo "=== ArgoCD Access Report ==="
echo "Generated: $(date)"
echo ""
echo "=== Current RBAC Policy ==="
kubectl get configmap argocd-rbac-cm -n argocd -o jsonpath='{.data.policy\.csv}'
echo ""
echo "=== Default Policy ==="
kubectl get configmap argocd-rbac-cm -n argocd -o jsonpath='{.data.policy\.default}'
echo ""
echo "=== Local Accounts ==="
kubectl get configmap argocd-cm -n argocd -o jsonpath='{.data}' | grep "accounts\."
echo ""
echo "=== Recent RBAC Changes (Git) ==="
cd /path/to/argocd-config && git log --oneline -10 argocd-rbac-cm.yaml
```

## Summary

Auditing RBAC changes in ArgoCD requires a multi-layered approach. Use Git as the source of truth for your RBAC configuration (with PR reviews and commit history), enable Kubernetes audit logging for detecting manual changes, set up notifications for real-time alerts, and regularly review access patterns in ArgoCD server logs. For compliance, combine all of these into periodic access reports that document who has access, how they got it, and what changes have been made.
