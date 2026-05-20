# How to Handle Tool Detection Conflicts in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Tool Detection, Troubleshooting

Description: Learn how to identify and resolve tool detection conflicts in ArgoCD when multiple tool marker files coexist in the same repository directory.

---

Tool detection conflicts happen when an ArgoCD application's source directory contains marker files for more than one tool. A directory with both `Chart.yaml` and `kustomization.yaml` is the classic example, but conflicts can also involve Jsonnet files, CMP plugin discovery patterns, or accidental marker files left from migrations. When detection conflicts occur, ArgoCD may select a source type you did not intend. This guide helps you identify, understand, and resolve these conflicts.

## Identifying Conflicts

The first sign of a tool detection conflict is usually an unexpected error. For example, you expect Helm to render your chart, but ArgoCD detects Kustomize instead because a `kustomization.yaml` happens to exist in the same directory.

### Check What ArgoCD Detected

```bash
# See the detected source type

argocd app get my-app -o json | jq '{
  sourceType: .status.sourceType,
  path: .spec.source.path,
  hasHelm: (.spec.source.helm != null),
  hasKustomize: (.spec.source.kustomize != null),
  hasDirectory: (.spec.source.directory != null),
  hasPlugin: (.spec.source.plugin != null)
}'
```

### Scan for Conflicting Files

Check what marker files exist in your source directory:

```bash
# Check for tool marker files in a directory
cd /path/to/your/repo/apps/my-app

# Helm markers
ls -la Chart.yaml 2>/dev/null && echo "HELM: Chart.yaml found"

# Kustomize markers
ls -la kustomization.yaml kustomization.yml Kustomization 2>/dev/null && echo "KUSTOMIZE: kustomization file found"

# Jsonnet files
find . -maxdepth 2 -name "*.jsonnet" -o -name "*.libsonnet" 2>/dev/null | head -5 && echo "JSONNET: jsonnet files found"

# Check for CMP plugin marker files
ls -la .sops.yaml custom-config.yaml .argocd-plugin 2>/dev/null
```

## Common Conflict Scenarios

### Conflict 1: Helm + Kustomize

This is the most common conflict. It happens when:

- You use Kustomize to overlay a Helm chart (kustomized-helm pattern)
- You migrated from Helm to Kustomize but forgot to remove `Chart.yaml`
- A generator or tool created both files

```text
my-app/
  Chart.yaml            # Helm marker
  kustomization.yaml    # Kustomize marker
  values.yaml
  overlays/
```

**Resolution options:**

1. Remove the conflicting file if it is not needed:
```bash
# If you want Kustomize, remove Chart.yaml
rm Chart.yaml
git add -A && git commit -m "Remove Chart.yaml to fix tool detection"
```

2. Use explicit tool specification in the Application spec:
```yaml
spec:
  source:
    path: apps/my-app
    kustomize:
      images:
        - my-app=my-app:v2.0
```

3. Use a CMP plugin that handles both tools:
```yaml
spec:
  source:
    path: apps/my-app
    plugin:
      name: kustomized-helm
```

### Conflict 2: Kustomize + Jsonnet

Jsonnet files are handled as part of the Directory source type. When both `kustomization.yaml` and `.jsonnet` files exist, ArgoCD detects Kustomize because `kustomization.yaml` is a built-in tool marker:

```text
monitoring/
  kustomization.yaml    # Kustomize wins
  main.jsonnet          # Ignored by ArgoCD
  lib/
    helpers.libsonnet
```

**Resolution:**

If you want Jsonnet, remove or rename the kustomization file and use a Directory source. If you want Kustomize, ensure the Jsonnet files are not meant to be rendered by ArgoCD from the same source directory.

### Conflict 3: Built-in Tool + CMP Plugin

CMP plugin discovery can match a directory that also has built-in tool markers. If your plugin matches a directory that also has `Chart.yaml`:

```text
my-app/
  Chart.yaml          # Helm marker
  *.cue               # CUE plugin discovery marker
```

**Resolution:**

Use explicit source configuration for the tool you intend. For example, use explicit plugin specification when the plugin should render the application:

```yaml
spec:
  source:
    plugin:
      name: cue-manifests
```

### Conflict 4: Multiple CMP Plugins Match

When two or more CMP plugins have discovery rules that match the same directory:

```text
my-app/
  secrets.yaml          # Matches sops-decrypt plugin
  kustomization.yaml    # Matches sops-kustomize plugin
  .sops.yaml            # Both plugins look for this
```

**Resolution:**

Make discovery rules more specific with negative matching:

```yaml
# sops-kustomize plugin - only match when BOTH exist
discover:
  find:
    command: [sh, -c]
    args:
      - |
        if [ -f "kustomization.yaml" ] && [ -f ".sops.yaml" ]; then
          echo "match"
        fi

# sops-decrypt plugin - only match when kustomization.yaml does NOT exist
discover:
  find:
    command: [sh, -c]
    args:
      - |
        if [ ! -f "kustomization.yaml" ] && [ -f ".sops.yaml" ]; then
          echo "match"
        fi
```

## Prevention Strategies

### Strategy 1: One Tool Per Directory

The simplest approach - structure your repositories so each directory only contains files for one tool:

```text
# Good structure - no conflicts possible
apps/
  my-app-helm/           # Only Helm files
    Chart.yaml
    values.yaml
    templates/
  my-app-kustomize/      # Only Kustomize files
    kustomization.yaml
    deployment.yaml
  monitoring-jsonnet/    # Only Jsonnet files
    main.jsonnet
    lib/
```

### Strategy 2: Always Specify Tool Type Explicitly

Add the tool type to every Application spec, even when auto-detection would work correctly. This makes the configuration self-documenting and prevents future conflicts:

```yaml
# Always explicit, never rely on auto-detection
spec:
  source:
    path: apps/my-app
    helm:          # Explicitly Helm
      values: |
        replicaCount: 3
```

### Strategy 3: Use .gitignore or File Naming

Keep non-ArgoCD tool files out of the source directory using `.gitignore` or file naming conventions:

```gitignore
# .gitignore - prevent tool conflicts
# Jsonnet files used for local development only
local-*.jsonnet
*.libsonnet.local

# Temporary chart files from migrations
Chart.yaml.bak
```

### Strategy 4: CI Validation

Add a CI check that scans for tool detection conflicts:

```bash
#!/bin/bash
# check-tool-conflicts.sh
# Run in CI to detect potential tool conflicts

find . -name "*.yaml" -path "*/apps/*" -print0 | while IFS= read -r -d '' file; do
  dir=$(dirname "$file")

  helm=false
  kustomize=false
  jsonnet=false

  [ -f "$dir/Chart.yaml" ] && helm=true
  [ -f "$dir/kustomization.yaml" ] || [ -f "$dir/kustomization.yml" ] || [ -f "$dir/Kustomization" ] && kustomize=true
  ls "$dir"/*.jsonnet "$dir"/*.libsonnet 2>/dev/null | grep -q . && jsonnet=true

  conflicts=0
  $helm && ((conflicts++))
  $kustomize && ((conflicts++))
  $jsonnet && ((conflicts++))

  if [ $conflicts -gt 1 ]; then
    echo "WARNING: Tool conflict in $dir"
    $helm && echo "  - Helm (Chart.yaml)"
    $kustomize && echo "  - Kustomize (kustomization.yaml)"
    $jsonnet && echo "  - Jsonnet (*.jsonnet)"
  fi
done
```

## Debugging Detection Conflicts

When you suspect a conflict, increase ArgoCD's log level for the repo-server to see detection decisions:

```bash
# Increase repo-server log level
kubectl patch configmap argocd-cmd-params-cm -n argocd \
  --type merge \
  -p '{"data":{"reposerver.log.level":"debug"}}'

# Restart repo-server to apply
kubectl rollout restart deployment argocd-repo-server -n argocd

# Watch for detection messages
kubectl logs deployment/argocd-repo-server -n argocd -f | grep -i "detect\|tool\|type"
```

After debugging, remember to set the log level back to `info`.

## Summary

Tool detection conflicts arise when multiple tool marker files coexist in the same source directory. ArgoCD resolves explicit source configuration first, then uses implicit detection for configured CMP plugins, Helm, Kustomize, or a plain Directory source. The best prevention is to structure repositories with one tool per directory and always specify the tool type explicitly in Application specs. When conflicts do occur, either remove the conflicting marker file, use explicit tool specification, or restructure the directory layout.
