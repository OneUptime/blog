# How to Debug Tool Detection Issues in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Tool Detection, Troubleshooting

Description: A practical guide to diagnosing and fixing tool detection problems in ArgoCD when applications fail because the wrong manifest generation tool is selected.

---

Tool detection issues in ArgoCD manifest themselves in confusing ways. You push a Kustomize overlay to Git, but ArgoCD tries to render it with Helm and fails. Or your CMP plugin never gets called because ArgoCD sees a file it thinks belongs to a built-in tool. These problems are subtle because ArgoCD does not loudly announce which tool it chose - it just uses it and fails with an error that seems unrelated to detection. This guide shows you how to trace detection issues and fix them efficiently.

## Symptoms of Detection Problems

### Wrong Tool Selected

The most obvious symptom is an error message from the wrong tool:

```
# Expected Kustomize, got Helm
ComparisonError: failed to load initial state of resource Deployment:
  helm template . --name-template my-app: Error: Chart.yaml file is missing

# Expected CMP plugin, got Kustomize
ComparisonError: failed to load initial state of resource:
  kustomize build: error: unable to find one of 'kustomization.yaml'...

# Expected Jsonnet, got Directory
ComparisonError: failed to load initial state of resource:
  error unmarshaling JSON: json: cannot unmarshal string into Go value
```

### Silent Wrong Output

Sometimes detection picks a tool that succeeds but produces wrong manifests. For example, treating a Helm chart directory as plain YAML will try to apply Go template syntax as literal strings, creating resources with `{{ .Values.xxx }}` in field values.

### Plugin Never Called

Your CMP plugin is installed and working, but certain applications never trigger it because a built-in tool matches first.

## Step-by-Step Debugging

### Step 1: Check the Current Source Type

Start by confirming what ArgoCD detected:

```bash
# Check source type via CLI
argocd app get my-app -o json | jq '{
  name: .metadata.name,
  sourceType: .status.sourceType,
  path: .spec.source.path,
  repoURL: .spec.source.repoURL,
  revision: .spec.source.targetRevision
}'

# Check via kubectl
kubectl get application my-app -n argocd \
  -o jsonpath='Source type: {.status.sourceType}{"\n"}'
```

If the sourceType does not match what you expect, you have a detection issue.

### Step 2: Examine the Source Directory

Check what files exist in the exact directory ArgoCD is looking at:

```bash
# Clone the repo at the same revision ArgoCD uses
REPO="https://github.com/myorg/configs.git"
REVISION=$(kubectl get application my-app -n argocd \
  -o jsonpath='{.spec.source.targetRevision}')
PATH_IN_REPO=$(kubectl get application my-app -n argocd \
  -o jsonpath='{.spec.source.path}')

git clone --depth 1 --branch "$REVISION" "$REPO" /tmp/debug-repo
ls -la "/tmp/debug-repo/$PATH_IN_REPO"
```

Look for these marker files:

```bash
cd "/tmp/debug-repo/$PATH_IN_REPO"

echo "=== Helm markers ==="
ls -la Chart.yaml 2>/dev/null || echo "  No Chart.yaml"

echo "=== Kustomize markers ==="
ls -la kustomization.yaml kustomization.yml Kustomization 2>/dev/null || echo "  No kustomization files"

echo "=== Jsonnet markers ==="
find . -maxdepth 1 \( -name "*.jsonnet" -o -name "*.libsonnet" \) -print 2>/dev/null || echo "  No Jsonnet files"

echo "=== Other files ==="
ls -la
```

### Step 3: Check for Explicit Type Specification

Verify whether the Application spec already forces a type:

```bash
kubectl get application my-app -n argocd -o json | jq '{
  helm: .spec.source.helm,
  kustomize: .spec.source.kustomize,
  directory: .spec.source.directory,
  plugin: .spec.source.plugin
}'
```

If any of these is non-null, that tool is being used regardless of auto-detection.

### Step 4: Enable Debug Logging

Turn on debug logging for the repo-server to see detection decisions:

```bash
# Enable debug logging
kubectl set env deployment/argocd-repo-server \
  -n argocd \
  ARGOCD_LOG_LEVEL=debug

# Wait for the pod to restart
kubectl rollout status deployment/argocd-repo-server -n argocd

# Watch for detection-related log entries
kubectl logs deployment/argocd-repo-server -n argocd -f | \
  grep -i "detect\|app type\|source type\|plugin\|discover"
```

### Step 5: Force a Refresh

Trigger manifest regeneration to see fresh detection:

```bash
# Force a hard refresh
argocd app get my-app --hard-refresh

# Or via kubectl annotation
kubectl annotate application my-app -n argocd \
  argocd.argoproj.io/refresh=hard --overwrite
```

Watch the logs during the refresh to see the detection process in real time.

### Step 6: Test CMP Plugin Discovery

If you suspect a CMP plugin is not being discovered, test its discovery rules:

```bash
# Exec into the plugin sidecar
kubectl exec -it deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- sh

# Check that the plugin is registered
ls -la /home/argocd/cmp-server/plugins/

# Check the plugin configuration
cat /home/argocd/cmp-server/config/plugin.yaml
```

Then simulate the discovery check:

```bash
# If using glob discovery
kubectl exec deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  sh -c 'find /tmp -name "*.cue" -print 2>/dev/null | head -5'

# If using command discovery - run the exact command
kubectl exec deployment/argocd-repo-server \
  -n argocd \
  -c my-custom-plugin -- \
  sh -c 'cd /tmp/test-dir && <your-discovery-command>'
```

## Common Issues and Fixes

### Issue: Hidden Chart.yaml in Subdirectory

If your source path contains subdirectories with their own `Chart.yaml`, ArgoCD only checks the root of the source path. But if your path itself points to a Helm chart, detection picks Helm.

```bash
# Your source path points to the wrong directory
# spec.source.path: apps/my-app  (has Chart.yaml)
# Should be: apps/my-app/kustomize  (only has kustomization.yaml)
```

Fix: Adjust the source path to point to the correct subdirectory.

### Issue: Case-Sensitive Detection

Remember that file detection is case-sensitive on Linux:

```bash
# These WILL trigger detection
Chart.yaml          # Helm
kustomization.yaml  # Kustomize
Kustomization       # Kustomize

# These will NOT trigger detection
chart.yaml          # Wrong case
CHART.YAML          # Wrong case
Kustomization.yaml  # Wrong - Kustomization has no extension
```

### Issue: Symlinks Not Followed

ArgoCD does not follow symlinks during detection. If `Chart.yaml` is a symlink to another file, detection may not work as expected.

### Issue: Git Sparse Checkout

If you are using Git sparse checkout and the marker file is excluded, detection will not find it:

```bash
# Make sure marker files are included in sparse checkout
git sparse-checkout add 'apps/my-app/Chart.yaml'
```

### Issue: Plugin Socket Not Created

If the CMP sidecar starts but does not create its socket file, it will not be available for discovery:

```bash
# Check for socket files
kubectl exec deployment/argocd-repo-server \
  -n argocd \
  -c argocd-repo-server -- \
  ls -la /home/argocd/cmp-server/plugins/

# Each plugin should have a .sock file
# If missing, check the plugin container logs for startup errors
```

## Creating a Detection Test Script

Build a script that mimics ArgoCD's detection logic for local testing:

```bash
#!/bin/bash
# detect-tool.sh - test ArgoCD tool detection locally
DIR=${1:-.}

echo "Checking directory: $DIR"
echo "========================"

if [ -f "$DIR/Chart.yaml" ]; then
  echo "DETECTED: Helm (Chart.yaml found)"
  echo "  Priority: 1 (highest)"
  exit 0
fi

if [ -f "$DIR/kustomization.yaml" ] || [ -f "$DIR/kustomization.yml" ] || [ -f "$DIR/Kustomization" ]; then
  echo "DETECTED: Kustomize"
  echo "  Priority: 2"
  exit 0
fi

if find "$DIR" -maxdepth 1 \( -name "*.jsonnet" -o -name "*.libsonnet" \) -print -quit 2>/dev/null | grep -q .; then
  echo "DETECTED: Jsonnet"
  echo "  Priority: 3"
  exit 0
fi

echo "DETECTED: Directory (plain YAML)"
echo "  Priority: 5 (fallback)"
echo ""
echo "Note: CMP plugins (Priority 4) cannot be tested locally"
echo "      without the ArgoCD repo-server environment."
```

Use it across your repository:

```bash
# Check all application directories
for dir in apps/*/; do
  ./detect-tool.sh "$dir"
  echo ""
done
```

## Preventing Future Detection Issues

1. **Always specify tool type explicitly** in Application specs for production
2. **Add CI checks** that validate each app directory has a clear tool type
3. **Document your conventions** for which tool each directory uses
4. **Use separate directories** for different tools, not mixed files
5. **Review PR changes** that add or remove marker files (Chart.yaml, kustomization.yaml)

## Summary

Debugging tool detection issues starts with checking what ArgoCD actually detected (`status.sourceType`), then examining the source directory for conflicting marker files, and finally verifying CMP plugin discovery if applicable. Most issues stem from unexpected marker files, case sensitivity, or the fixed priority order placing Helm above Kustomize. The permanent fix is to always specify tool types explicitly and structure your repositories to avoid ambiguity. For deeper visibility into your ArgoCD operations, consider setting up monitoring with [OneUptime](https://oneuptime.com) to catch detection-related sync failures early.
