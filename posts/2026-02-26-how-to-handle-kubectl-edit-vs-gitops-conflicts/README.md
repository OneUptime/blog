# How to Handle kubectl edit vs GitOps Conflicts

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Troubleshooting, Drift Detection

Description: Learn how to detect, resolve, and prevent conflicts between manual kubectl edits and ArgoCD GitOps-managed resources, including self-heal strategies and drift prevention techniques.

---

It happens in every organization adopting GitOps. A developer is debugging a production issue at 2 AM and runs `kubectl edit deployment` to change an image tag or scale replicas. The fix works, but now the cluster state has diverged from Git. ArgoCD detects the drift and either reverts the change (if self-heal is on) or shows the resource as OutOfSync. This guide covers how to handle the tension between quick manual changes and GitOps discipline.

## The Fundamental Conflict

GitOps operates on a simple principle: Git is the source of truth. Everything in the cluster should match what is in Git. When someone uses `kubectl edit`, `kubectl scale`, `kubectl set image`, or any other imperative command, they bypass Git and create a divergence.

ArgoCD responds to this divergence in one of three ways depending on your configuration:

1. **Manual sync, no self-heal**: ArgoCD shows the resource as OutOfSync but does nothing. The manual change persists until someone triggers a sync.
2. **Auto sync, no self-heal**: ArgoCD syncs on Git changes but does not revert manual cluster changes. The manual change persists until Git changes.
3. **Auto sync with self-heal**: ArgoCD actively reverts manual changes to match Git. This is the strictest GitOps enforcement.

## Detecting kubectl Edits

### ArgoCD Diff View

The ArgoCD UI shows diffs between the desired state (Git) and the live state (cluster):

```bash
# CLI equivalent
argocd app diff my-app
```

This shows exactly what fields were changed manually.

### Event-Based Detection

Kubernetes audit logs capture who changed what:

```bash
# Query audit logs for manual changes
kubectl get events -n my-namespace --field-selector reason=Updated | \
  grep -v "argocd" | \
  grep -v "system:serviceaccount:argocd"
```

### Script-Based Drift Detection

Here is a script that checks all ArgoCD applications for drift:

```bash
#!/bin/bash
# detect-drift.sh - Find applications with manual changes
set -euo pipefail

echo "Checking for GitOps drift across all applications..."
echo ""

APPS_JSON=$(argocd app list -o json)
DRIFTED=0

echo "${APPS_JSON}" | jq -r '.[] | "\(.metadata.name)\t\(.status.sync.status)\t\(.spec.project)"' | \
  while IFS=$'\t' read -r name sync_status project; do
    if [[ "${sync_status}" == "OutOfSync" ]]; then
      DRIFTED=$((DRIFTED + 1))
      echo "DRIFT: ${name} (project: ${project})"

      # Show the diff summary
      DIFF=$(argocd app diff "${name}" 2>/dev/null || echo "Unable to compute diff")
      if [[ -n "${DIFF}" ]]; then
        echo "${DIFF}" | head -20
        echo "  ..."
      fi
      echo ""
    fi
  done

echo "Total drifted applications: ${DRIFTED}"
```

## Resolution Strategies

### Strategy 1: Revert to Git State

The simplest resolution is to sync the application, which reverts all manual changes:

```bash
# Revert all manual changes for an application
argocd app sync my-app

# Force sync if there are issues
argocd app sync my-app --force

# Sync only specific resources
argocd app sync my-app --resource apps:Deployment:my-deployment
```

### Strategy 2: Commit the Manual Change to Git

If the manual change was correct (e.g., a hotfix), commit it to Git to make it the new desired state:

```bash
# Export the current live state
kubectl get deployment my-app -n my-namespace -o yaml > /tmp/current-state.yaml

# Clean up Kubernetes metadata
yq 'del(.metadata.resourceVersion, .metadata.uid, .metadata.generation,
        .metadata.creationTimestamp, .metadata.managedFields, .status)' \
  /tmp/current-state.yaml > /tmp/clean-state.yaml

# Compare with the Git version
diff /path/to/gitops-repo/apps/deployment.yaml /tmp/clean-state.yaml

# Update the Git repo with the live state
cp /tmp/clean-state.yaml /path/to/gitops-repo/apps/deployment.yaml
cd /path/to/gitops-repo
git add apps/deployment.yaml
git commit -m "Adopt hotfix: update deployment to match production state"
git push
```

### Strategy 3: Selective Ignore

If certain fields are legitimately managed outside Git (e.g., HPA-managed replicas), configure ArgoCD to ignore them:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  ignoreDifferences:
    # Ignore replica count (managed by HPA)
    - group: apps
      kind: Deployment
      jsonPointers:
        - /spec/replicas

    # Ignore specific annotation managed by external tools
    - group: apps
      kind: Deployment
      jqPathExpressions:
        - .metadata.annotations."external-tool/last-updated"

    # Ignore fields managed by specific controllers
    - group: apps
      kind: Deployment
      managedFieldsManagers:
        - kube-controller-manager
```

## Prevention: Self-Heal Configuration

### Enable Self-Heal

Self-heal is the most effective prevention. It automatically reverts manual changes:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
spec:
  syncPolicy:
    automated:
      prune: true
      selfHeal: true
    syncOptions:
      - RespectIgnoreDifferences=true
```

With self-heal enabled, if someone runs `kubectl edit`, ArgoCD detects the change within the reconciliation interval (default 3 minutes, configurable) and reverts it.

### Self-Heal Timeout

Control how quickly self-heal kicks in:

```yaml
# In argocd-cmd-params-cm
data:
  controller.self.heal.timeout.seconds: "5"
```

A shorter timeout means faster reversion but more API server load. The default of 5 seconds means ArgoCD waits 5 seconds after detecting drift before healing.

### Selective Self-Heal

You cannot enable self-heal per resource within an Application, but you can structure your applications so that critical resources are in a self-healing Application while resources that need manual flexibility are in a separate Application without self-heal.

## Handling Emergency Changes

Sometimes manual changes are necessary during incidents. Here is a workflow that balances urgency with GitOps discipline:

### Step 1: Make the Emergency Change

```bash
# Apply the emergency fix
kubectl set image deployment/my-app my-app=my-app:hotfix-123 -n production
```

### Step 2: Immediately Create a Git Commit

Even during an incident, create a corresponding Git change:

```bash
# Quick Git commit to match the emergency change
cd /path/to/gitops-repo
sed -i 's/tag: .*/tag: hotfix-123/' apps/my-app/values.yaml
git add apps/my-app/values.yaml
git commit -m "EMERGENCY: hotfix-123 deployed manually during incident INC-456"
git push
```

### Step 3: Disable Self-Heal Temporarily (if needed)

If self-heal would revert your emergency fix before Git catches up:

```bash
# Temporarily disable self-heal
argocd app set my-app --self-heal=false

# After Git change is synced, re-enable
argocd app set my-app --self-heal=true
```

### Step 4: Follow Up

After the incident:

```bash
# Verify the application is back in sync
argocd app get my-app

# Create a proper fix branch if the hotfix was a workaround
git checkout -b fix/INC-456-proper-fix
# ... make the proper fix ...
```

## RBAC Approach: Limit kubectl Write Access

Prevent the problem at its source by restricting who can make changes to ArgoCD-managed namespaces:

```yaml
# ClusterRole that allows read-only access
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: gitops-reader
rules:
  - apiGroups: ["*"]
    resources: ["*"]
    verbs: ["get", "list", "watch"]
  - apiGroups: [""]
    resources: ["pods/log", "pods/portforward"]
    verbs: ["get", "create"]
  # Allow exec for debugging but not resource modification
  - apiGroups: [""]
    resources: ["pods/exec"]
    verbs: ["create"]
---
# Bind this role to developer groups for production namespaces
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: developers-readonly
  namespace: production
subjects:
  - kind: Group
    name: developers
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: ClusterRole
  name: gitops-reader
  apiGroup: rbac.authorization.k8s.io
```

## Monitoring and Alerting on Drift

Set up alerts when drift is detected:

```yaml
# PrometheusRule for drift detection
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: argocd-drift-alerts
  namespace: argocd
spec:
  groups:
    - name: argocd-drift
      rules:
        - alert: ArgoCDApplicationOutOfSync
          expr: |
            argocd_app_info{sync_status="OutOfSync"} == 1
          for: 10m
          labels:
            severity: warning
          annotations:
            summary: "ArgoCD application {{ $labels.name }} is out of sync"
            description: "Application {{ $labels.name }} has been OutOfSync for more than 10 minutes. This may indicate manual kubectl changes."
```

## Summary

The tension between `kubectl edit` and GitOps is a cultural and technical challenge. Technically, self-heal is the strongest enforcement mechanism - it ensures Git always wins. But culturally, you need to provide teams with a fast path for emergency changes that still respects the Git workflow. The best approach combines strict self-heal for production, clear emergency change procedures, RBAC restrictions on direct cluster access, and monitoring that alerts on any detected drift. Over time, as teams build confidence in their GitOps workflow, the frequency of manual changes naturally decreases.
