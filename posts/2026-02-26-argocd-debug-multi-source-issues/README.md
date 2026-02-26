# How to Debug Multi-Source Application Issues in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Multi-Source, Troubleshooting

Description: Learn how to systematically debug common issues with ArgoCD multi-source applications, from rendering failures to sync conflicts and ref resolution problems.

---

Multi-source ArgoCD applications introduce additional complexity compared to single-source setups. When something goes wrong, you need to determine which source is causing the problem, whether the issue is in rendering or syncing, and how the sources interact. This guide provides a systematic approach to diagnosing and fixing multi-source issues.

## Common Symptoms and Their Causes

Before diving into debugging steps, here are the most frequent symptoms and what usually causes them:

| Symptom | Likely Cause |
|---|---|
| ComparisonError | One source fails to render manifests |
| OutOfSync but sync succeeds | Resource conflict between sources |
| Missing resources | Wrong path in a source, or ref not resolving |
| "values file not found" | Incorrect ref path or missing file |
| "repository not found" | Source repo not registered with ArgoCD |
| Partial sync | One source renders, another fails silently |
| Unexpected resource state | Source ordering causing overwrites |

## Step 1: Get the Full Error Message

Start by getting the complete application status:

```bash
# Full application details including conditions and errors
argocd app get my-multi-source-app

# JSON output for detailed inspection
argocd app get my-multi-source-app -o json | jq '.status.conditions'

# Check the operation state for sync errors
argocd app get my-multi-source-app -o json | jq '.status.operationState'

# View the sync result details
argocd app get my-multi-source-app -o json | jq '.status.operationState.syncResult'
```

The error message usually indicates which source is failing. Look for repository URLs or file paths in the error text.

## Step 2: Test Each Source Independently

Create temporary single-source Applications to test each source in isolation:

```bash
# Test Source 1 alone
argocd app create test-source-1 \
  --repo https://github.com/your-org/repo-a.git \
  --path apps/my-app \
  --revision main \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace test \
  --sync-policy none

argocd app manifests test-source-1  # Check if it renders

# Test Source 2 alone
argocd app create test-source-2 \
  --repo https://github.com/your-org/repo-b.git \
  --path configs/my-app \
  --revision main \
  --dest-server https://kubernetes.default.svc \
  --dest-namespace test \
  --sync-policy none

argocd app manifests test-source-2  # Check if it renders

# Clean up test apps
argocd app delete test-source-1 --cascade=false
argocd app delete test-source-2 --cascade=false
```

If one source renders but the other fails, you have isolated the problem.

## Step 3: Check Repository Access

Multi-source applications require all repositories to be registered with ArgoCD:

```bash
# List registered repositories
argocd repo list

# Check if a specific repo is accessible
argocd repo get https://github.com/your-org/repo-a.git

# Test connection to a repository
argocd repo add https://github.com/your-org/repo-a.git --ssh-private-key-path ~/.ssh/id_rsa
```

If a repository is not registered or credentials are expired, that source will fail silently or with an authentication error.

## Step 4: Debug Ref Resolution

The `ref` mechanism is a common source of issues. Here is how to debug it:

```yaml
# Example multi-source with ref
sources:
  - repoURL: https://charts.example.com
    chart: my-chart
    targetRevision: 1.0.0
    helm:
      valueFiles:
        - $config/values/production.yaml  # This is the ref path

  - repoURL: https://github.com/your-org/config-repo.git
    targetRevision: main
    ref: config  # Creates $config reference
```

Debug checklist:

```bash
# 1. Verify the ref source repo is accessible
argocd repo get https://github.com/your-org/config-repo.git

# 2. Clone the repo and check the file exists at the specified revision
git clone https://github.com/your-org/config-repo.git
cd config-repo
git checkout main
ls -la values/production.yaml

# 3. Verify the path is correct
# $config/values/production.yaml means:
# - $config = root of config-repo
# - values/production.yaml = path from repo root
# Full path: config-repo/values/production.yaml

# 4. Check for typos in the ref name
# The ref name in source must match the $name in valueFiles
# ref: config -> $config (not $Config, not $configs)
```

Common ref issues:
- **File does not exist at the target revision** - The branch may not have the file
- **Wrong ref name** - `$config` vs `$configs` (pluralization mistake)
- **Missing ref source** - The source with `ref:` was removed or commented out
- **Path includes repo name** - `$config/config-repo/values/...` is wrong; the repo name is not part of the path

## Step 5: Check for Resource Conflicts

When multiple sources define the same resource:

```bash
# Render all manifests and find duplicates
argocd app manifests my-multi-source-app -o json | \
  jq -r '.[] | "\(.apiVersion)/\(.kind)/\(.metadata.namespace // "none")/\(.metadata.name)"' | \
  sort | uniq -c | sort -rn

# Resources appearing more than once are conflicts
# Example output:
#   2 apps/v1/Deployment/default/my-app     <-- CONFLICT
#   1 v1/Service/default/my-app
#   1 v1/ConfigMap/default/my-config
```

Resolve conflicts by removing the duplicate from one source or renaming resources.

## Step 6: Check Repo Server Logs

The ArgoCD repo server handles manifest rendering. Its logs contain detailed error information:

```bash
# Follow repo server logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server -f

# Search for errors related to your application
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server --tail=200 | \
  grep -i "my-multi-source-app\|error\|failed"

# If using multiple repo server replicas, check all of them
kubectl logs -n argocd deployment/argocd-repo-server --all-containers --tail=100
```

Look for:
- Git clone failures
- Helm template rendering errors
- Kustomize build errors
- Jsonnet evaluation errors
- File not found errors

## Step 7: Compare Rendered vs Live Manifests

```bash
# Rendered manifests (what ArgoCD wants to apply)
argocd app manifests my-multi-source-app > desired.yaml

# Live manifests (what is in the cluster)
argocd app manifests my-multi-source-app --source live > live.yaml

# Compare them
diff desired.yaml live.yaml
```

Differences indicate what ArgoCD will change during sync. Unexpected differences might reveal a conflict or rendering issue.

## Step 8: Force Hard Refresh

ArgoCD caches rendered manifests. A stale cache can cause misleading behavior:

```bash
# Hard refresh clears the cache and re-fetches from all sources
argocd app get my-multi-source-app --hard-refresh

# If the issue persists, try restarting the repo server
kubectl rollout restart deployment argocd-repo-server -n argocd
```

## Debugging Specific Source Types

### Helm Source Issues

```bash
# Test Helm rendering locally
helm template my-release chart-name \
  --version 1.0.0 \
  -f path/to/values.yaml

# Check Helm chart availability
helm repo add test-repo https://charts.example.com
helm search repo test-repo/my-chart --versions

# Verify values file YAML syntax
python3 -c "import yaml; yaml.safe_load(open('values.yaml')); print('Valid YAML')"
```

### Kustomize Source Issues

```bash
# Test Kustomize build locally
cd path/to/kustomize/overlay
kustomize build .

# Check for missing bases or resources
kustomize build . 2>&1 | grep -i "error\|not found\|missing"
```

### Git Source Issues

```bash
# Verify the revision exists
git ls-remote https://github.com/your-org/repo.git | grep main

# Check if the path exists at the revision
git archive --remote=https://github.com/your-org/repo.git main -- path/to/check
```

## Debugging Sync Failures

If rendering succeeds but sync fails:

```bash
# View the sync result details
argocd app get my-multi-source-app -o json | \
  jq '.status.operationState.syncResult.resources[] | select(.status != "Synced")'

# Check for specific resource apply errors
argocd app get my-multi-source-app -o json | \
  jq '.status.operationState.syncResult.resources[] | select(.message != "")'

# View Kubernetes events for failed resources
kubectl get events -n <namespace> --sort-by='.lastTimestamp' | tail -20
```

## Debugging Performance Issues

Multi-source applications take longer to render because ArgoCD must process each source:

```bash
# Check repo server timeout configuration
kubectl get configmap argocd-cmd-params-cm -n argocd -o yaml | \
  grep -i timeout

# If timeouts occur, increase the timeout
kubectl patch configmap argocd-cmd-params-cm -n argocd \
  --type merge -p '{"data":{"reposerver.timeout.seconds":"300"}}'

# Check repo server resource usage
kubectl top pods -n argocd -l app.kubernetes.io/name=argocd-repo-server
```

If the repo server is running out of memory, increase its resource limits. Each source consumes memory during rendering.

## Creating a Debugging Checklist

When you encounter a multi-source issue, work through this checklist:

1. Read the error message from `argocd app get`
2. Identify which source is failing (check error for URLs or paths)
3. Verify all repos are registered with ArgoCD
4. Test each source independently
5. Check ref names and paths for typos
6. Verify files exist at the specified revisions
7. Look for resource conflicts between sources
8. Check repo server logs for detailed errors
9. Hard refresh to clear the cache
10. Test rendering locally (Helm template, Kustomize build, etc.)

## Enabling Debug Logging

For persistent debugging, enable debug logging on the repo server:

```bash
kubectl patch configmap argocd-cmd-params-cm -n argocd \
  --type merge -p '{"data":{"reposerver.log.level":"debug"}}'

kubectl rollout restart deployment argocd-repo-server -n argocd
```

Remember to set the log level back to `info` once debugging is complete to avoid excessive log volume.

For more on multi-source applications, see [using multiple sources in ArgoCD](https://oneuptime.com/blog/post/2026-02-26-argocd-multiple-sources-single-application/view) and [handling conflicts between sources](https://oneuptime.com/blog/post/2026-02-26-argocd-conflicts-multiple-sources/view).
