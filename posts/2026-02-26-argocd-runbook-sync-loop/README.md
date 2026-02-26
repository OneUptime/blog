# ArgoCD Runbook: Application Stuck in Sync Loop

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Runbook, Troubleshooting

Description: A step-by-step operational runbook for diagnosing and fixing ArgoCD applications stuck in an infinite sync loop, covering resource diff issues, mutating webhooks, and controller conflicts.

---

An ArgoCD application stuck in a sync loop is one of the most common and frustrating problems you will encounter. The application continuously syncs, reports success, immediately detects drift, and syncs again. This creates unnecessary load on the cluster, floods notification channels, and masks real changes. This runbook provides a systematic approach to diagnose and fix the problem.

## Symptoms

You will observe one or more of the following.

- The application shows "Synced" status but immediately transitions to "OutOfSync"
- The sync count in metrics is abnormally high (multiple syncs per minute)
- The ArgoCD UI shows the application constantly refreshing
- Notification channels are flooded with sync success messages
- The application controller CPU usage is elevated

## Impact Assessment

**Severity:** P3 (individual app) to P2 (if it affects controller performance for all apps)

**Impact:** The stuck application consumes controller and repo server resources, potentially slowing down other applications. If auto-sync with prune is enabled, resources may be continuously deleted and recreated.

## Diagnostic Steps

### Step 1: Identify the Drifting Resources

The first step is to find which resources are causing the drift.

```bash
# Get the application diff
argocd app diff my-app

# If the diff is large, save it to a file for analysis
argocd app diff my-app > /tmp/app-diff.txt

# Check which resources are out of sync
argocd app get my-app --show-resources | grep OutOfSync
```

The diff output shows exactly which fields are different between the desired and live state. Look for fields that ArgoCD sets during sync but something else modifies immediately after.

### Step 2: Check for Mutating Webhooks

Mutating admission webhooks modify resources as they are applied. ArgoCD applies the resource with specific values, but the webhook changes them, causing an immediate diff.

```bash
# List mutating webhooks
kubectl get mutatingwebhookconfigurations

# Check if any webhooks target the affected resource type
kubectl get mutatingwebhookconfigurations -o yaml | grep -A 10 "rules:"

# Common culprits:
# - Istio sidecar injector (adds/modifies annotations and containers)
# - Vault injector (adds init containers)
# - OPA/Gatekeeper (modifies labels)
# - Linkerd (adds annotations)
```

### Step 3: Check for Controller Conflicts

Other Kubernetes controllers may modify resources that ArgoCD manages.

```bash
# Check if another controller is modifying the resource
kubectl get events -n <namespace> --field-selector involvedObject.name=<resource-name> --sort-by='.lastTimestamp'

# Common controllers that cause conflicts:
# - HPA (modifies deployment replicas)
# - VPA (modifies resource requests)
# - Cert-Manager (modifies ingress annotations)
# - External-DNS (modifies ingress/service annotations)
```

### Step 4: Examine the Diff Closely

Common fields that cause sync loops.

```bash
# Run the diff and look for these patterns
argocd app diff my-app 2>&1 | head -100

# Pattern 1: metadata.generation or metadata.resourceVersion
# These are set by Kubernetes, not your manifests

# Pattern 2: status fields
# Status is set by controllers, not manifests

# Pattern 3: annotations added by webhooks
# e.g., sidecar.istio.io/status

# Pattern 4: default values
# Kubernetes adds defaults that are not in your manifests
# e.g., spec.template.spec.terminationGracePeriodSeconds: 30
```

## Resolution Options

### Solution 1: Ignore Specific Fields

If the drifting fields are set by external controllers or webhooks, tell ArgoCD to ignore them.

```yaml
# In the Application spec
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  ignoreDifferences:
  # Ignore HPA-managed replicas
  - group: apps
    kind: Deployment
    jsonPointers:
    - /spec/replicas

  # Ignore Istio sidecar annotations
  - group: apps
    kind: Deployment
    jsonPointers:
    - /metadata/annotations/sidecar.istio.io~1status
    - /spec/template/metadata/annotations/sidecar.istio.io~1status

  # Ignore VPA-managed resource requests
  - group: apps
    kind: Deployment
    jqPathExpressions:
    - .spec.template.spec.containers[].resources.requests
```

For system-level ignores that apply to all applications, use the `resource.customizations.ignoreDifferences` setting.

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  resource.customizations.ignoreDifferences.all: |
    managedFieldsManagers:
    - kube-controller-manager
    - cluster-autoscaler
  resource.customizations.ignoreDifferences.apps_Deployment: |
    jsonPointers:
    - /spec/replicas
```

### Solution 2: Use Server-Side Diff

Server-side diff uses the Kubernetes API server to compute the diff, which correctly handles defaulting and admission webhook modifications.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  annotations:
    # Enable server-side diff for this app
    argocd.argoproj.io/compare-option: ServerSideDiff=true
spec:
  # ... rest of spec
```

Or enable it globally.

```yaml
# argocd-cm ConfigMap
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  controller.diff.server.side: "true"
```

Server-side diff resolves most sync loop issues caused by defaulting and mutations because it compares what the API server would actually create rather than a naive text diff.

### Solution 3: Include the Defaulted Values

If the sync loop is caused by Kubernetes adding default values, include those values in your manifests.

```yaml
# Before: Kubernetes adds terminationGracePeriodSeconds: 30
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      containers:
      - name: app
        image: myapp:v1

# After: Explicitly set the default value
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      terminationGracePeriodSeconds: 30  # Explicit default
      containers:
      - name: app
        image: myapp:v1
```

### Solution 4: Fix Resource Ownership

If two controllers are fighting over a resource, you need to decide which one owns it.

```yaml
# If HPA manages replicas, remove replicas from the Deployment manifest
# and tell ArgoCD to ignore it

# Option A: Remove from manifest + ignore diff
ignoreDifferences:
- group: apps
  kind: Deployment
  jsonPointers:
  - /spec/replicas

# Option B: Use replace sync strategy instead of apply
syncPolicy:
  syncOptions:
  - Replace=true  # Caution: this replaces the entire resource
```

### Solution 5: Disable Auto-Sync Temporarily

If the sync loop is causing problems, disable auto-sync while you investigate.

```bash
# Disable auto-sync
argocd app set my-app --sync-policy none

# Investigate the diff
argocd app diff my-app

# Re-enable after fixing
argocd app set my-app --sync-policy automated
```

## Verification

After applying a fix, verify the sync loop has stopped.

```bash
# Watch the application for a few minutes
argocd app get my-app --refresh

# Check sync count is not increasing
# Wait 5 minutes and run:
argocd app get my-app --show-operation

# Verify the diff is clean
argocd app diff my-app
# Should output: No differences found
```

## Prevention

To prevent future sync loops, establish these practices.

1. Always enable server-side diff for applications that use mutating webhooks
2. Configure `ignoreDifferences` proactively for known external controllers (HPA, VPA, cert-manager)
3. Include Kubernetes default values in your manifests
4. Test new applications in a staging environment before enabling auto-sync in production

## Escalation

If the above steps do not resolve the sync loop:

- Check the ArgoCD GitHub issues for similar reports
- Escalate to the platform engineering team with the diff output and controller logs
- As a last resort, disable auto-sync and manage the application manually until the root cause is found

For more ArgoCD troubleshooting guides, see our [operations runbook overview](https://oneuptime.com/blog/post/2026-02-26-argocd-operations-runbook/view).
