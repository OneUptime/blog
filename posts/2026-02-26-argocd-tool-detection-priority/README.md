# How to Configure Tool Detection Priority in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Tool Detection, Configuration

Description: Learn how to influence and configure the order in which ArgoCD evaluates tool types during automatic detection for application manifest generation.

---

ArgoCD's automatic tool detection is intentionally limited: if a tool is explicitly configured, ArgoCD uses that tool; otherwise, repo-server checks for a matching CMP plugin, then detects Helm or Kustomize marker files, and finally falls back to plain directory processing. Jsonnet is processed as part of directory applications, not as a separately auto-detected source type. This guide covers how detection works internally, how to make CMP plugin matching predictable, and practical techniques to steer detection toward the tool you want.

## The Built-in Priority Order

ArgoCD's source type detection is hardcoded in the repo-server:

```text
Step 1: Explicit source type (helm, kustomize, directory, or plugin)
Step 2: CMP plugin discovery rules
Step 3: Helm / Kustomize marker files
Step 4: Directory fallback (YAML, JSON, and Jsonnet files)
```

This detection logic is part of ArgoCD's source code and cannot be changed through configuration. However, there are several ways to work around it.

## CMP Plugin Priority

Among CMP plugins, ArgoCD lists the plugin socket directory and checks each socket until it finds a plugin whose discovery rule matches. In Go, `os.ReadDir` returns directory entries sorted by filename, so automatic CMP matching is effectively determined by plugin socket name, not by Kubernetes container order.

The socket name is derived from the plugin name, or from the plugin name plus version when the plugin has a version. For predictable matching, give plugins names that sort in the order you want, or explicitly name the plugin in the Application spec.

For example, these plugin names make the intended order visible:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ConfigManagementPlugin
metadata:
  # Checked before 20-sops-plain and 30-cue-manifests
  name: 10-sops-kustomize
spec:
  generate:
    command: [sh, -c, "kustomize build ."]
  discover:
    find:
      command: [sh, -c]
      args:
        - |
          if [ -f kustomization.yaml ] && find . -name "*.enc.yaml" | grep -q .; then
            echo "matched"
          fi
```

To avoid depending on automatic CMP ordering, explicitly select the plugin in the Application spec:

```yaml
spec:
  source:
    plugin:
      name: 10-sops-kustomize
```

## Techniques for Influencing Detection

### Technique 1: Remove Conflicting Files

The most straightforward way to influence detection is to ensure only the marker files for your desired tool exist:

```bash
# If you want Kustomize but Helm keeps winning

# Remove Chart.yaml from your directory
rm apps/my-app/Chart.yaml
git add -A && git commit -m "Remove Chart.yaml to use Kustomize"
```

### Technique 2: Configure the Source Explicitly

For applications that use the App-of-Apps pattern, you can set tool types at the source level in your ApplicationSet or parent application template:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: my-apps
  namespace: argocd
spec:
  generators:
    - git:
        repoURL: https://github.com/myorg/configs.git
        revision: main
        directories:
          - path: apps/*
  template:
    spec:
      source:
        repoURL: https://github.com/myorg/configs.git
        targetRevision: main
        path: '{{path}}'
        # Force Kustomize for all generated apps
        kustomize:
          commonLabels:
            managed-by: argocd
```

### Technique 3: Plugin Discovery with Exclusions

Design your CMP plugin discovery rules to be very specific, using negative conditions to avoid matching when built-in tools should handle the directory:

```yaml
# This plugin should only match when there are NO built-in tool markers
spec:
  discover:
    find:
      command: [sh, -c]
      args:
        - |
          # Exclude directories meant for built-in tools
          [ -f "Chart.yaml" ] && exit 0
          [ -f "kustomization.yaml" ] && exit 0
          [ -f "kustomization.yml" ] && exit 0
          [ -f "Kustomization" ] && exit 0
          find . -maxdepth 1 -name "*.jsonnet" | grep -q . && exit 0

          # Now check for our custom marker
          if [ -f "custom-config.yaml" ]; then
            echo "matched"
          fi
```

### Technique 4: Wrapper Directories

Structure your repository so the ArgoCD application points at a directory that only contains the tool you want:

```text
apps/
  my-app/
    helm/                    # Point ArgoCD here for Helm
      Chart.yaml
      values.yaml
      templates/
    kustomize/               # Point ArgoCD here for Kustomize
      kustomization.yaml
      patches/
    raw/                     # Point ArgoCD here for plain YAML
      deployment.yaml
      service.yaml
```

Then create separate applications for each tool:

```yaml
# Helm application
spec:
  source:
    path: apps/my-app/helm

# Kustomize application
spec:
  source:
    path: apps/my-app/kustomize
```

### Technique 5: Explicit Type Always

The most reliable technique is to never rely on auto-detection. Always specify the tool type in every Application spec:

```yaml
# Template for team applications
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
spec:
  source:
    repoURL: https://github.com/myorg/configs.git
    path: apps/my-app
    # ALWAYS explicit - no auto-detection needed
    kustomize:
      images:
        - my-app=my-app:v2.0
```

This is the recommended approach for production environments because it eliminates detection ambiguity entirely.

## Configuring Default Tool Behavior

While you cannot change detection priority, you can configure default behavior for each tool through ArgoCD's ConfigMaps:

### Default Helm Behavior

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Allow additional Helm values file URL schemes
  helm.valuesFileSchemes: >-
    secrets+gpg-import, secrets+gpg-import-kubernetes,
    secrets+age-import, secrets+age-import-kubernetes,
    secrets, https
```

### Default Kustomize Behavior

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Use a specific Kustomize version
  kustomize.buildOptions: --enable-helm --load-restrictor LoadRestrictionsNone

  # Custom Kustomize binary path
  kustomize.path.v5.2.1: /custom/path/kustomize
```

### Disabling Built-in Tools

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Disable unused built-in generators.
  # Disabled source types fall back to plain directory processing.
  helm.enable: "true"
  kustomize.enable: "true"
  jsonnet.enable: "true"
```

## Priority with Multi-Source Applications

In multi-source applications, each source has independent detection. You can mix tools across sources:

```yaml
spec:
  sources:
    # Source 1: Auto-detected as Helm (has Chart.yaml)
    - repoURL: https://github.com/myorg/charts.git
      path: charts/nginx

    # Source 2: Explicitly forced to Kustomize
    - repoURL: https://github.com/myorg/configs.git
      path: overlays/production
      kustomize:
        namePrefix: prod-

    # Source 3: Explicitly forced to CMP plugin
    - repoURL: https://github.com/myorg/secrets.git
      path: secrets/production
      plugin:
        name: sops-decrypt
```

## Monitoring Detection Behavior

Track which tools are being used across your applications:

```bash
# List all applications with their detected source types
argocd app list -o json | jq '.[] | {name: .metadata.name, sourceType: .status.sourceType}'

# Count applications by source type
argocd app list -o json | jq '[.[] | .status.sourceType] | group_by(.) | map({type: .[0], count: length})'
```

This gives you visibility into whether detection is working as expected across your entire ArgoCD instance.

## Summary

ArgoCD's built-in tool detection logic is fixed and cannot be reconfigured. However, you can influence detection through several practical techniques: remove conflicting marker files, structure directories for one tool each, make CMP plugin discovery rules precise, and - most importantly - always explicitly specify the tool type in production Application specs. For CMP plugins specifically, automatic matching checks plugin sockets in sorted name order, so explicit plugin selection is the most reliable way to avoid ambiguity.
