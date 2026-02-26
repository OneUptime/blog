# How to Debug Jsonnet Rendering Issues in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Jsonnet, Troubleshooting

Description: Learn how to diagnose and fix common Jsonnet rendering errors in ArgoCD, from import failures to type mismatches and performance issues.

---

Jsonnet rendering errors in ArgoCD can be frustrating because the error messages often appear in the ArgoCD UI without much context. Unlike Helm, where you can run `helm template` and get clear output, Jsonnet errors in ArgoCD are processed by the repo server and surfaced through the application status. This guide covers the most common Jsonnet rendering issues and how to systematically debug them.

## Where Jsonnet Errors Appear

When Jsonnet rendering fails in ArgoCD, you will see the error in several places:

- **Application status** - The app shows as "Unknown" or "ComparisonError"
- **ArgoCD UI** - The app card displays a red error with a truncated message
- **ArgoCD CLI** - `argocd app get <name>` shows the full error under Conditions
- **Repo server logs** - The full stack trace appears in the argocd-repo-server pod logs

Start by getting the full error message:

```bash
# Get application status with full error details
argocd app get my-jsonnet-app

# Check conditions for rendering errors
argocd app get my-jsonnet-app -o json | jq '.status.conditions'

# Check repo server logs for the detailed error
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server \
  --tail=100 | grep -i "jsonnet\|error\|failed"
```

## Common Error: Import Not Found

The most frequent Jsonnet error in ArgoCD is a failed import:

```
RUNTIME ERROR: couldn't open import "lib/k8s.libsonnet": no match locally or in the Jsonnet library paths
```

This means the Jsonnet evaluator cannot find the file you are trying to import. The causes are:

**Wrong library path configuration** - Check that your `directory.jsonnet.libs` paths are correct and relative to the repository root:

```yaml
# Verify library paths in your Application spec
spec:
  source:
    path: apps/my-app
    directory:
      jsonnet:
        libs:
          # These are relative to repo root, NOT to source.path
          - vendor
          - lib
```

**File not committed to Git** - ArgoCD clones the repo, so the file must exist in Git. If you are using jsonnet-bundler, make sure the `vendor` directory is committed:

```bash
# Check if the file exists in the repo
git ls-files vendor/
git ls-files lib/

# If vendor is gitignored, remove it from .gitignore
grep vendor .gitignore
```

**Case sensitivity** - File paths in Jsonnet are case-sensitive. `Lib/K8s.libsonnet` is different from `lib/k8s.libsonnet`.

**Test locally with the same paths** - Reproduce the exact same import resolution locally:

```bash
# From the repository root, run jsonnet with the same library paths
jsonnet -J vendor -J lib apps/my-app/main.jsonnet
```

## Common Error: Type Mismatch

Jsonnet is dynamically typed but strict about type operations. You will see errors like:

```
RUNTIME ERROR: Unexpected type string, expected number
```

This often happens when external variables or TLAs pass the wrong type:

```jsonnet
// This will fail if replicas is passed as a string
function(replicas)
{
  spec: {
    replicas: replicas,  // Error if replicas is "3" instead of 3
  },
}
```

The fix depends on how you are passing the value:

```yaml
# For TLAs - use code: true to pass as number
directory:
  jsonnet:
    tlas:
      - name: replicas
        value: "3"
        code: true  # This evaluates "3" as the number 3

# For extVars - parse inside Jsonnet
# std.parseInt(std.extVar('replicas'))
```

## Common Error: Manifest Is Not a Valid Kubernetes Object

ArgoCD expects Jsonnet output to be either a single Kubernetes object or an array of objects. If the output is not valid, you get:

```
ComparisonError: failed to unmarshal manifest
```

Check that your Jsonnet output contains proper `apiVersion`, `kind`, and `metadata` fields:

```jsonnet
// Wrong - missing required Kubernetes fields
{ name: 'my-app', replicas: 3 }

// Right - proper Kubernetes object
{
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: { name: 'my-app' },
  spec: { replicas: 3 },
}
```

Verify your output locally:

```bash
# Render and validate the output structure
jsonnet main.jsonnet | python3 -c "
import json, sys
data = json.load(sys.stdin)
if isinstance(data, list):
    for i, obj in enumerate(data):
        if 'apiVersion' not in obj or 'kind' not in obj:
            print(f'Object {i} missing apiVersion or kind')
elif isinstance(data, dict):
    if 'apiVersion' not in data or 'kind' not in data:
        print('Object missing apiVersion or kind')
else:
    print('Output is not a dict or list')
"
```

## Common Error: Infinite Recursion

Jsonnet evaluates lazily, so infinite recursion errors only appear when a field is actually accessed:

```
RUNTIME ERROR: max stack frames exceeded
```

This typically happens with circular imports or self-referencing objects:

```jsonnet
// Circular reference - will cause stack overflow
local a = { x: b.y };
local b = { y: a.x };
a
```

Break the cycle by restructuring your code to avoid circular dependencies. If you are using the `+:` merge operator extensively, check for unintentional loops.

## Common Error: Duplicate Field Names

Jsonnet does not allow duplicate field names in the same object by default:

```
RUNTIME ERROR: duplicate field name: "name"
```

```jsonnet
// This fails - duplicate "name" field
{
  name: 'first',
  name: 'second',  // Error: duplicate field
}

// Fix: use the override operator
{
  name: 'first',
} + {
  name: 'second',  // This overrides the first value
}
```

## Debugging with argocd app manifests

The most useful command for debugging Jsonnet rendering is `argocd app manifests`, which shows you exactly what ArgoCD will apply:

```bash
# Show the rendered manifests (what ArgoCD will apply)
argocd app manifests my-jsonnet-app

# Show the live manifests (what is currently in the cluster)
argocd app manifests my-jsonnet-app --source live

# Compare rendered vs live
diff <(argocd app manifests my-jsonnet-app) \
     <(argocd app manifests my-jsonnet-app --source live)
```

If this command fails, the rendering itself is broken and you need to check the repo server logs.

## Debugging Slow Jsonnet Rendering

If your Jsonnet renders correctly but takes too long, ArgoCD may time out:

```
rpc error: code = Unknown desc = repo server timeout
```

To diagnose performance issues:

```bash
# Time the local rendering
time jsonnet -J vendor -J lib apps/my-app/main.jsonnet > /dev/null

# Check if the output is very large
jsonnet -J vendor -J lib apps/my-app/main.jsonnet | wc -c

# Increase ArgoCD repo server timeout if needed
kubectl edit configmap argocd-cmd-params-cm -n argocd
# Add: reposerver.timeout.seconds: "300"
```

Common causes of slow rendering include generating hundreds of resources from loops, importing very large library files, and deeply nested object merges.

## Setting Up a Local Debugging Environment

The most effective debugging approach is to reproduce ArgoCD's rendering locally:

```bash
# Install jsonnet CLI
# macOS
brew install jsonnet

# Linux
go install github.com/google/go-jsonnet/cmd/jsonnet@latest

# Clone the same repo and revision ArgoCD is using
git clone https://github.com/your-org/k8s-manifests.git
cd k8s-manifests
git checkout <same-revision-as-argocd>

# Run with the same parameters ArgoCD uses
# Check your ArgoCD Application spec for extVars, TLAs, and libs

# For extVars
jsonnet -J vendor -J lib \
  --ext-str environment=staging \
  --ext-str image_tag=v1.0 \
  apps/my-app/main.jsonnet

# For TLAs
jsonnet -J vendor -J lib \
  --tla-str environment=staging \
  --tla-code replicas=3 \
  apps/my-app/main.jsonnet
```

## Enabling Verbose Logging on the Repo Server

For persistent debugging, increase the repo server log level:

```bash
# Increase repo server log level to debug
kubectl patch configmap argocd-cmd-params-cm -n argocd \
  --type merge -p '{"data":{"reposerver.log.level":"debug"}}'

# Restart the repo server to pick up the change
kubectl rollout restart deployment argocd-repo-server -n argocd

# Watch the logs
kubectl logs -n argocd -l app.kubernetes.io/name=argocd-repo-server -f
```

## Hard Refresh to Force Re-rendering

Sometimes ArgoCD caches the rendered output and you need to force a fresh render:

```bash
# Hard refresh clears the cache and re-renders from Git
argocd app get my-jsonnet-app --hard-refresh

# Or from the UI: click on the app, then click the Refresh button
# while holding Shift to trigger a hard refresh
```

## Summary Checklist

When debugging Jsonnet rendering in ArgoCD, work through this checklist:

1. Get the full error message from `argocd app get` or repo server logs
2. Verify the file exists in Git at the correct path
3. Check library paths are relative to repo root
4. Test rendering locally with the same jsonnet command and parameters
5. Verify output is valid Kubernetes objects (has apiVersion, kind, metadata)
6. Check for type mismatches in extVars/TLAs (use `code: true` for non-strings)
7. Hard refresh the application to clear cached results
8. Increase repo server timeout if rendering is slow

For more on using Jsonnet with ArgoCD, see our guides on [external variables](https://oneuptime.com/blog/post/2026-02-26-argocd-jsonnet-external-variables/view) and [library path configuration](https://oneuptime.com/blog/post/2026-02-26-argocd-jsonnet-library-paths/view).
