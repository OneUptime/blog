# How to Configure Tool Detection Priority in ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Tool Detection, Configuration

Description: Learn how to influence and configure the order in which ArgoCD evaluates tool types during automatic detection for application manifest generation.

---

ArgoCD's automatic tool detection follows a fixed priority order: Helm first, then Kustomize, Jsonnet, CMP plugins, and finally plain YAML. While you cannot change this built-in priority for the core tools, you can influence detection behavior through several configuration mechanisms. This guide covers how detection priority works internally, how to adjust CMP plugin ordering, and practical techniques to steer detection toward the tool you want.

## The Built-in Priority Order

ArgoCD's core detection priority is hardcoded in the repo-server:

```
Priority 1: Helm        (Chart.yaml)
Priority 2: Kustomize   (kustomization.yaml / kustomization.yml / Kustomization)
Priority 3: Jsonnet      (*.jsonnet / *.libsonnet)
Priority 4: CMP Plugins  (plugin discovery rules)
Priority 5: Directory    (fallback - all YAML files)
```

This order is part of ArgoCD's source code and cannot be changed through configuration. However, there are several ways to work around it.

## CMP Plugin Priority

Among CMP plugins, the order in which they are evaluated depends on the order the sidecar containers register with the repo-server. This is determined by:

1. The order sidecar containers are listed in the pod spec
2. The order they finish starting up
3. The order their socket files appear in the plugins directory

In practice, the pod spec order is what matters most:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: argocd-repo-server
  namespace: argocd
spec:
  template:
    spec:
      containers:
        - name: argocd-repo-server
          # Main repo-server container

        # Plugin evaluated first (highest CMP priority)
        - name: sops-kustomize
          image: my-registry/argocd-cmp-sops-kustomize:v1.0

        # Plugin evaluated second
        - name: sops-plain
          image: my-registry/argocd-cmp-sops-plain:v1.0

        # Plugin evaluated third (lowest CMP priority)
        - name: cue-manifests
          image: my-registry/argocd-cmp-cue:v1.0
```

To change CMP plugin priority, reorder the sidecar containers in the deployment spec.

## Techniques for Influencing Detection

### Technique 1: Remove Conflicting Files

The most straightforward way to influence detection is to ensure only the marker files for your desired tool exist:

```bash
# If you want Kustomize but Helm keeps winning
# Remove Chart.yaml from your directory
rm apps/my-app/Chart.yaml
git add -A && git commit -m "Remove Chart.yaml to use Kustomize"
```

### Technique 2: Use .argocd-source Configuration

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

```
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
  # Set default Helm parameters
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

### Default Directory Behavior

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: argocd-cm
  namespace: argocd
data:
  # Configure directory tool defaults
  resource.exclusions: |
    - apiGroups:
        - ""
      kinds:
        - "Event"
      clusters:
        - "*"
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

ArgoCD's built-in tool detection priority (Helm > Kustomize > Jsonnet > CMP > Directory) is fixed and cannot be reconfigured. However, you can influence detection through several practical techniques: remove conflicting marker files, structure directories for one tool each, make CMP plugin discovery rules precise, and - most importantly - always explicitly specify the tool type in production Application specs. For CMP plugins specifically, the sidecar container order in the pod spec determines which plugin gets evaluated first.
