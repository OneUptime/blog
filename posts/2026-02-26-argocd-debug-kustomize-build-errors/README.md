# How to Debug Kustomize Build Errors in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Kustomize, Troubleshooting

Description: A practical troubleshooting guide for diagnosing and fixing Kustomize build errors in ArgoCD, covering common failure patterns, log analysis, and step-by-step debugging techniques.

---

Your ArgoCD application shows "ComparisonError" or "InvalidSpecError" and the sync button does nothing useful. The error message mentions Kustomize but is not helpful. This is one of the most frustrating ArgoCD experiences because the failure happens inside the repo server during manifest rendering, and the error messages are often cryptic.

This guide covers systematic debugging of Kustomize build failures in ArgoCD, from reading the right logs to reproducing errors locally and fixing the most common problems.

## Where Errors Appear

Kustomize build errors show up in several places in ArgoCD:

1. **Application status** - The app shows "Unknown" or "ComparisonError"
2. **Sync status** - Shows "ComparisonError" with a message
3. **Repo server logs** - The most detailed error output
4. **ArgoCD UI** - Error banner at the top of the application view

## Step 1: Read the Application Error

Start with the application status:

```bash
# Get the full application status including error messages
argocd app get my-app

# Get the status in JSON for parsing
argocd app get my-app -o json | jq '.status.conditions'

# Look specifically for comparison errors
argocd app get my-app -o json | jq '.status.conditions[] | select(.type == "ComparisonError")'
```

Common error messages and what they mean:

- `rpc error: code = Unknown desc = Manifest generation error` - Kustomize build failed
- `kustomize build failed` - The `kustomize build` command returned a non-zero exit code
- `accumulating resources` - A file referenced in `resources` does not exist or has errors
- `no matches for kind` - A CRD is referenced but not installed

## Step 2: Check Repo Server Logs

The repo server is where Kustomize runs. Its logs contain the actual build output:

```bash
# Stream repo server logs and filter for errors
kubectl logs -n argocd deploy/argocd-repo-server --follow | grep -i "error\|fail\|kustomize"

# Get logs from the last 5 minutes
kubectl logs -n argocd deploy/argocd-repo-server --since=5m

# If there are multiple replicas, check all of them
kubectl logs -n argocd -l app.kubernetes.io/component=repo-server --all-containers
```

Look for lines containing the actual `kustomize build` error output. The error typically shows the exact file and line number.

## Step 3: Reproduce Locally

The fastest way to debug is reproducing the error on your machine:

```bash
# Clone the same repo and checkout the same revision
git clone https://github.com/myorg/k8s-configs.git
cd k8s-configs
git checkout main  # Or whatever targetRevision the app uses

# Run kustomize build on the same path
kustomize build apps/my-app/overlays/production

# If ArgoCD uses build options, include them
kustomize build --enable-helm apps/my-app/overlays/production
```

If the build succeeds locally but fails in ArgoCD, the issue is likely a version difference or missing build options.

## Common Error: Missing Resources

```
Error: accumulating resources: accumulation err='accumulating resources from '../../base':
read /tmp/..../base/deployment.yaml: no such file or directory'
```

This means a file referenced in `resources` does not exist at the expected path:

```yaml
# kustomization.yaml
resources:
  - ../../base          # Does this directory exist?
  - deployment.yaml     # Is this file in the same directory?
  - extra-service.yaml  # Was this file deleted but not removed from here?
```

Fix: Check that every file and directory listed in `resources` exists. Check for typos in file names and paths.

## Common Error: Invalid YAML

```
Error: accumulating resources: accumulation err='merging resources from 'deployment.yaml':
yaml: line 15: did not find expected key'
```

A YAML syntax error in one of your manifests:

```bash
# Validate YAML syntax
yamllint apps/my-app/base/deployment.yaml

# Or use a quick Python check
python3 -c "import yaml; yaml.safe_load(open('deployment.yaml'))"
```

Common YAML mistakes:
- Tabs instead of spaces
- Incorrect indentation
- Missing quotes around strings that look like numbers or booleans
- Colons in values without quotes

## Common Error: Duplicate Resources

```
Error: accumulating resources: may not add resource with
an already registered id: apps_v1_Deployment|~|my-app|my-api
```

Two resources with the same Group/Version/Kind, namespace, and name:

```yaml
# This happens when both base and overlay define the same resource
resources:
  - ../../base           # Contains deployment.yaml with name: my-api
  - my-api-override.yaml # Also defines a Deployment named my-api
```

Fix: Use patches instead of resources for modifications:

```yaml
# Correct approach - use patches to modify base resources
resources:
  - ../../base

patches:
  - path: my-api-override.yaml
```

## Common Error: Unknown Field

```
Error: json: unknown field "replacements"
```

The Kustomize version in ArgoCD does not support the field you are using:

```bash
# Check ArgoCD's Kustomize version
kubectl exec -n argocd deploy/argocd-repo-server -- kustomize version
```

Fix: Either upgrade Kustomize in ArgoCD or use an older equivalent feature. For example, use `vars` instead of `replacements` for older versions.

## Common Error: Load Restrictions

```
Error: accumulating resources: security; file '/absolute/path' is not in or below '/working/dir'
```

Kustomize blocks access to files outside the Kustomize root by default:

```yaml
# argocd-cm ConfigMap - relax load restrictions
data:
  kustomize.buildOptions: "--load-restrictor LoadRestrictionsNone"
```

## Common Error: Helm Chart Inflation

```
Error: unable to find plugin ... helmCharts
```

If you use `helmCharts` in kustomization.yaml, ArgoCD must pass the `--enable-helm` flag:

```yaml
# argocd-cm ConfigMap
data:
  kustomize.buildOptions: "--enable-helm"
```

## Step 4: Build Inside the Repo Server

For issues that only reproduce in ArgoCD, build directly inside the repo server pod:

```bash
# Exec into the repo server
kubectl exec -it -n argocd deploy/argocd-repo-server -- bash

# Navigate to the cached repo (ArgoCD caches repos in /tmp)
ls /tmp/

# Find your repo
find /tmp -name "kustomization.yaml" -path "*/my-app/*" 2>/dev/null

# Run the build inside the container
kustomize build /tmp/<repo-path>/apps/my-app/overlays/production
```

This shows the exact error in the same environment ArgoCD uses.

## Step 5: Force a Refresh

Sometimes the repo server cache is stale. Force a hard refresh:

```bash
# Force a hard refresh (re-clones the repo)
argocd app get my-app --hard-refresh

# Or delete the repo cache
kubectl exec -n argocd deploy/argocd-repo-server -- rm -rf /tmp/<repo-hash>
```

## Debugging with Diff

If the build succeeds but the sync fails, check the diff:

```bash
# See what ArgoCD wants to apply
argocd app diff my-app

# Check for specific resources
argocd app diff my-app --resource ':Deployment:my-api'
```

## Prevention: CI Validation

Add a CI step to catch Kustomize errors before they reach ArgoCD:

```yaml
# .github/workflows/validate.yaml
name: Validate Kustomize
on: [pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Kustomize
        run: |
          curl -sL "https://github.com/kubernetes-sigs/kustomize/releases/download/kustomize%2Fv5.3.0/kustomize_v5.3.0_linux_amd64.tar.gz" | \
            tar xz -C /usr/local/bin/

      - name: Validate all overlays
        run: |
          EXIT_CODE=0
          for kustomization in $(find . -name "kustomization.yaml" -path "*/overlays/*"); do
            DIR=$(dirname "$kustomization")
            echo "Building ${DIR}..."
            if ! kustomize build "${DIR}" > /dev/null 2>&1; then
              echo "FAILED: ${DIR}"
              kustomize build "${DIR}"
              EXIT_CODE=1
            fi
          done
          exit $EXIT_CODE
```

## Quick Reference: Error to Fix

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `accumulating resources` | Missing file | Check file paths |
| `unknown field` | Version mismatch | Upgrade Kustomize or use older syntax |
| `already registered id` | Duplicate resource | Use patches instead |
| `security; file is not in or below` | Load restriction | Add `--load-restrictor LoadRestrictionsNone` |
| `yaml: line N` | YAML syntax error | Fix indentation/syntax |
| `unable to find plugin` | Missing flag | Add `--enable-helm` or `--enable-alpha-plugins` |

For more on Kustomize with ArgoCD, see our [deploying Kustomize with ArgoCD guide](https://oneuptime.com/blog/post/2026-01-25-deploy-kustomize-argocd/view).
