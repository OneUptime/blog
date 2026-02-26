# How to Use Multiple Plugins in a Single ArgoCD Application

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Config Management Plugins, Multi-Source

Description: Learn how to chain multiple Config Management Plugins in a single ArgoCD application using multi-source configurations and composite plugin patterns.

---

Sometimes a single CMP plugin is not enough. You might need to decrypt secrets with SOPS, then render Helm templates, then apply Kustomize patches - all for one application. ArgoCD does not natively support chaining multiple plugins in sequence, but there are practical workarounds that let you accomplish this. This guide covers three approaches: building a composite plugin, using multi-source applications, and using a wrapper plugin that calls other tools.

## The Challenge

ArgoCD's plugin architecture assigns exactly one plugin to each application source. You cannot specify multiple plugins in sequence:

```yaml
# This does NOT work - only one plugin per source
spec:
  source:
    plugin:
      name: sops-decrypt    # First plugin
      name: helm-render      # Second plugin - INVALID
```

So how do you combine multiple tools when your workflow needs them?

## Approach 1: The Composite Plugin

The most straightforward solution is to build a single plugin that runs all the tools you need internally. Instead of chaining separate plugins, you create one plugin that orchestrates the entire pipeline:

```yaml
# plugin.yaml - composite sops + helm + kustomize plugin
apiVersion: argoproj.io/v1alpha1
kind: ConfigManagementPlugin
metadata:
  name: sops-helm-kustomize
spec:
  version: v1.0
  init:
    command: [sh, -c]
    args:
      - |
        set -euo pipefail

        # Step 1: Decrypt SOPS-encrypted files
        echo "Decrypting SOPS files..." >&2
        for f in $(find . -name "*.yaml" -o -name "*.yml"); do
          if grep -q "^sops:" "$f" 2>/dev/null; then
            echo "  Decrypting $f" >&2
            sops --decrypt --in-place "$f"
          fi
        done

        # Step 2: Build Helm dependencies
        if [ -f "Chart.yaml" ]; then
          echo "Building Helm dependencies..." >&2
          helm dependency build . 2>/dev/null || true
        fi
  generate:
    command: [sh, -c]
    args:
      - |
        set -euo pipefail

        RELEASE=${ARGOCD_APP_NAME:-release}
        NAMESPACE=${ARGOCD_APP_NAMESPACE:-default}

        # Step 3: Render Helm chart
        echo "Rendering Helm chart..." >&2
        VALUES_ARGS=""
        for f in values.yaml values-*.yaml secrets.yaml secrets-*.yaml; do
          [ -f "$f" ] && VALUES_ARGS="$VALUES_ARGS -f $f"
        done

        mkdir -p /tmp/helm-output
        helm template "$RELEASE" . \
          --namespace "$NAMESPACE" \
          --include-crds \
          $VALUES_ARGS \
          > /tmp/helm-output/all.yaml

        # Step 4: Apply Kustomize patches (if kustomization exists)
        if [ -f "kustomization.yaml" ]; then
          echo "Applying Kustomize patches..." >&2
          cp kustomization.yaml /tmp/helm-output/
          [ -d "patches" ] && cp -r patches/ /tmp/helm-output/
          cd /tmp/helm-output
          kustomize build .
        else
          cat /tmp/helm-output/all.yaml
        fi
  discover:
    find:
      command: [sh, -c]
      args:
        - |
          # Match repos with both Chart.yaml and encrypted files
          if [ -f "Chart.yaml" ] && find . -name "*.yaml" -exec grep -l "^sops:" {} \; 2>/dev/null | head -1 | grep -q .; then
            echo "matched"
          fi
```

The Dockerfile for this composite plugin includes all three tools:

```dockerfile
FROM alpine:3.19

# Install all required tools
RUN apk add --no-cache curl bash git gnupg

# Helm
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

# Kustomize
RUN curl -fsSL https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh | bash && \
    mv kustomize /usr/local/bin/

# SOPS
RUN curl -fsSL "https://github.com/getsops/sops/releases/download/v3.8.1/sops-v3.8.1.linux.amd64" \
      -o /usr/local/bin/sops && \
    chmod +x /usr/local/bin/sops

# age (for SOPS encryption)
RUN apk add --no-cache age

# ArgoCD CMP server
COPY --from=quay.io/argoproj/argocd:v2.10.0 \
    /usr/local/bin/argocd-cmp-server \
    /usr/local/bin/argocd-cmp-server

COPY plugin.yaml /home/argocd/cmp-server/config/plugin.yaml

USER 999
ENTRYPOINT ["/usr/local/bin/argocd-cmp-server"]
```

## Approach 2: Multi-Source Applications

ArgoCD v2.6+ supports multi-source applications, where each source can use a different plugin. This does not chain plugins in sequence, but it lets you combine outputs from different plugins:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: my-app
  namespace: argocd
spec:
  project: default
  sources:
    # Source 1: Helm chart rendered by custom plugin
    - repoURL: https://github.com/myorg/helm-charts.git
      targetRevision: main
      path: charts/my-app
      plugin:
        name: custom-helm
        env:
          - name: ENVIRONMENT
            value: production

    # Source 2: Additional resources with SOPS decryption
    - repoURL: https://github.com/myorg/k8s-secrets.git
      targetRevision: main
      path: secrets/my-app/production
      plugin:
        name: sops-decrypt

    # Source 3: Extra ConfigMaps from plain YAML
    - repoURL: https://github.com/myorg/k8s-configs.git
      targetRevision: main
      path: configmaps/my-app

  destination:
    server: https://kubernetes.default.svc
    namespace: my-app
```

Each source is processed independently, and the resulting manifests are merged. This works well when:

- Different parts of your application come from different repos
- Some resources need decryption while others do not
- You want to add extra resources on top of a Helm chart

It does not work when you need to pipe the output of one plugin into another (like Helm output through Kustomize patches).

## Approach 3: Wrapper Plugin with Sub-Commands

For maximum flexibility, build a wrapper plugin that dispatches to different tools based on a configuration file in the repository:

```yaml
# plugin.yaml - generic pipeline plugin
apiVersion: argoproj.io/v1alpha1
kind: ConfigManagementPlugin
metadata:
  name: pipeline-plugin
spec:
  version: v1.0
  generate:
    command: [sh, -c]
    args:
      - |
        set -euo pipefail

        # Read pipeline configuration from the repo
        if [ ! -f ".argocd-pipeline.yaml" ]; then
          echo "Error: .argocd-pipeline.yaml not found" >&2
          exit 1
        fi

        # Parse the pipeline stages
        # Expected format:
        # stages:
        #   - tool: sops
        #     args: ["--decrypt", "--in-place"]
        #     files: "*.enc.yaml"
        #   - tool: helm
        #     args: ["template", "release", "."]
        #   - tool: kustomize
        #     args: ["build", "."]

        # Simple pipeline execution
        CURRENT_DIR=$(pwd)
        OUTPUT_DIR="/tmp/pipeline-output"
        mkdir -p "$OUTPUT_DIR"

        # Stage 1: Decrypt (if SOPS files exist)
        if grep -q "sops" .argocd-pipeline.yaml; then
          for f in $(find . -name "*.enc.yaml"); do
            sops --decrypt "$f" > "${f%.enc.yaml}.yaml"
          done
        fi

        # Stage 2: Helm template (if Chart.yaml exists)
        if grep -q "helm" .argocd-pipeline.yaml && [ -f "Chart.yaml" ]; then
          helm dependency build . 2>/dev/null || true
          VALUES=""
          for f in values*.yaml; do
            [ -f "$f" ] && VALUES="$VALUES -f $f"
          done
          helm template "$ARGOCD_APP_NAME" . \
            --namespace "$ARGOCD_APP_NAMESPACE" \
            $VALUES > "$OUTPUT_DIR/helm-output.yaml"
        fi

        # Stage 3: Kustomize (if kustomization.yaml exists)
        if grep -q "kustomize" .argocd-pipeline.yaml && [ -f "kustomization.yaml" ]; then
          if [ -f "$OUTPUT_DIR/helm-output.yaml" ]; then
            cp "$OUTPUT_DIR/helm-output.yaml" .
            kustomize build .
          else
            kustomize build .
          fi
        elif [ -f "$OUTPUT_DIR/helm-output.yaml" ]; then
          cat "$OUTPUT_DIR/helm-output.yaml"
        else
          # Fallback: output all YAML files
          cat *.yaml
        fi
  discover:
    find:
      glob: "**/.argocd-pipeline.yaml"
```

The repository includes a `.argocd-pipeline.yaml` that controls the pipeline:

```yaml
# .argocd-pipeline.yaml
stages:
  - sops
  - helm
  - kustomize
```

## When to Use Each Approach

| Approach | Best For | Complexity |
|----------|----------|-----------|
| Composite Plugin | Fixed tool chain, same pipeline every time | Low |
| Multi-Source | Independent resources from different repos/tools | Medium |
| Wrapper Plugin | Configurable pipelines that vary per app | High |

For most teams, the composite plugin approach is the right choice. It is simple, predictable, and easy to debug. Multi-source is useful when your manifests naturally live in different repositories. The wrapper plugin is for teams with many different tool combinations who want to avoid maintaining multiple plugin images.

## Testing Multiple Tool Chains Locally

Before deploying any of these patterns, test the full pipeline locally:

```bash
# Simulate the composite plugin pipeline
cd /path/to/your/app

# Step 1: Decrypt
for f in $(find . -name "*.yaml" -exec grep -l "^sops:" {} \;); do
  sops --decrypt --in-place "$f"
done

# Step 2: Helm template
helm dependency build .
helm template my-app . -f values.yaml > /tmp/all.yaml

# Step 3: Kustomize
cp kustomization.yaml /tmp/
cd /tmp
kustomize build .

# Validate the output
kustomize build . | kubectl apply --dry-run=client -f -
```

## Performance Considerations

Running multiple tools in sequence adds up. Each tool has its own startup time, and operations like dependency resolution can be slow:

- Set the CMP timeout high enough to cover all stages (see [plugin timeout configuration](https://oneuptime.com/blog/post/2026-02-26-argocd-plugin-timeouts/view))
- Cache dependencies that are shared across stages
- Parallelize independent operations within a stage
- Monitor the total generation time and optimize the slowest stage first

## Summary

While ArgoCD assigns one plugin per source, you can effectively use multiple tools through composite plugins that chain operations internally, multi-source applications that combine outputs from different plugins, or wrapper plugins that read a configuration file to determine the pipeline. The composite plugin approach is simplest and covers most use cases where you need SOPS decryption with Helm rendering and Kustomize patching.
