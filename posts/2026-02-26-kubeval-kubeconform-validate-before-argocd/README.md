# How to Use kubeval and kubeconform to Validate Manifests Before ArgoCD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: ArgoCD, GitOps, Kubernetes, Validation, kubeconform

Description: Learn how to use kubeval and kubeconform to validate Kubernetes manifests against API schemas before ArgoCD deploys them, catching errors early in the GitOps pipeline.

---

ArgoCD will happily try to apply whatever manifests it finds in your Git repository. If those manifests reference a deprecated API version, use an invalid field name, or have a typo in a resource kind, you will only find out when ArgoCD reports a sync failure. By then, the bad manifest is already in your main branch and blocking deployments.

kubeval and its successor kubeconform solve this by validating manifests against the official Kubernetes API schemas before they ever reach ArgoCD. This guide covers both tools, when to use each, and how to integrate them into your GitOps workflow.

## kubeval vs kubeconform

kubeval was the original Kubernetes manifest validator. It works but is no longer actively maintained. kubeconform is its spiritual successor with better performance, more features, and active development.

| Feature | kubeval | kubeconform |
|---------|---------|-------------|
| Status | Deprecated | Actively maintained |
| Speed | Slow for large sets | 5-10x faster |
| CRD support | Limited | Full support |
| Output formats | JSON, TAP | JSON, JUnit, text |
| Schema sources | Bundled | Configurable |
| Kubernetes version support | Up to 1.24 | Current versions |

**Recommendation**: Use kubeconform for new projects. Only use kubeval if you have existing tooling that depends on it.

## Installing kubeconform

```bash
# macOS
brew install kubeconform

# Linux
curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
  sudo tar xz -C /usr/local/bin

# Docker
docker pull ghcr.io/yannh/kubeconform:latest

# Verify installation
kubeconform -v
```

## Basic Validation

The simplest usage validates YAML files against the default Kubernetes schema:

```bash
# Validate a single file
kubeconform deployment.yaml

# Validate a directory
kubeconform apps/my-app/production/

# Validate with summary output
kubeconform -summary apps/my-app/production/
# Output:
# Summary: 5 resources found parsing 3 files - Valid: 5, Invalid: 0, Errors: 0, Skipped: 0
```

## Validating Against a Specific Kubernetes Version

Different Kubernetes versions support different API versions and fields. Validate against the version your clusters actually run:

```bash
# Validate against Kubernetes 1.28
kubeconform -kubernetes-version 1.28.0 apps/my-app/production/

# This catches deprecated APIs
# For example, if you use networking.k8s.io/v1beta1 Ingress
# on a cluster running 1.22+, kubeconform will flag it:
# apps/my-app/production/ingress.yaml - Ingress networking.k8s.io/v1beta1 is not valid
```

When you manage multiple clusters running different Kubernetes versions, validate against the oldest version to ensure compatibility:

```bash
# Validate against the oldest cluster version
OLDEST_K8S_VERSION="1.27.0"
kubeconform -kubernetes-version "$OLDEST_K8S_VERSION" apps/my-app/production/
```

## Strict Mode

By default, kubeconform allows unknown fields. Strict mode catches accidental fields:

```yaml
# This has a typo: "conatiners" instead of "containers"
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  template:
    spec:
      conatiners:  # TYPO!
      - name: app
        image: my-app:latest
```

```bash
# Default mode: passes (unknown field is ignored)
kubeconform deployment.yaml
# No output - validation passed

# Strict mode: catches the typo
kubeconform -strict deployment.yaml
# deployment.yaml - Deployment is invalid:
# For field spec.template.spec: Additional property conatiners is not allowed
```

Always use strict mode in CI pipelines:

```bash
kubeconform -strict -summary apps/my-app/production/
```

## Validating Custom Resources (CRDs)

By default, kubeconform skips resources it does not recognize, including ArgoCD Application resources and other CRDs. To validate CRDs, provide their schemas:

```bash
# Download ArgoCD CRD schemas
mkdir -p /tmp/crd-schemas

# Option 1: Use the datree schema repository
kubeconform \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  apps/my-app/production/

# Option 2: Generate schemas from installed CRDs
for crd in $(kubectl get crd -o name); do
  CRD_NAME=$(echo "$crd" | cut -d/ -f2)
  kubectl get "$crd" -o json | \
    jq '.spec.versions[-1].schema.openAPIV3Schema' > \
    "/tmp/crd-schemas/${CRD_NAME}.json"
done

kubeconform \
  -schema-location default \
  -schema-location '/tmp/crd-schemas/{{ .ResourceKind }}.json' \
  apps/my-app/production/
```

## Validating Helm Output

Since Helm charts produce YAML at render time, validate the rendered output:

```bash
# Render and validate Helm chart
helm template my-app ./charts/my-app \
  --values charts/my-app/values-production.yaml \
  --namespace production | \
  kubeconform -strict -summary -kubernetes-version 1.28.0

# For charts with multiple value files
helm template my-app ./charts/my-app \
  --values charts/my-app/values.yaml \
  --values charts/my-app/values-production.yaml | \
  kubeconform -strict -summary
```

Validate for each environment:

```bash
# Validate for all environments
for env in dev staging production; do
  echo "=== Validating $env ==="
  helm template my-app ./charts/my-app \
    --values "charts/my-app/values-${env}.yaml" | \
    kubeconform -strict -summary -kubernetes-version 1.28.0
done
```

## Validating Kustomize Output

Similarly, validate rendered Kustomize overlays:

```bash
# Build and validate Kustomize overlay
kustomize build apps/my-app/overlays/production | \
  kubeconform -strict -summary -kubernetes-version 1.28.0

# Validate all overlays
for overlay in apps/my-app/overlays/*/; do
  echo "=== Validating $overlay ==="
  kustomize build "$overlay" | \
    kubeconform -strict -summary -kubernetes-version 1.28.0
done
```

## CI Pipeline Integration

Integrate kubeconform into your CI pipeline to catch issues before they reach the main branch:

```yaml
# GitHub Actions
name: Validate Kubernetes Manifests
on:
  pull_request:
    paths:
    - 'apps/**'
    - 'charts/**'

jobs:
  validate:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        k8s-version: ['1.27.0', '1.28.0', '1.29.0']

    steps:
    - uses: actions/checkout@v4

    - name: Install kubeconform
      run: |
        curl -sL https://github.com/yannh/kubeconform/releases/latest/download/kubeconform-linux-amd64.tar.gz | \
          sudo tar xz -C /usr/local/bin

    - name: Install tools
      run: |
        # Install Helm
        curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
        # Install Kustomize
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        sudo mv kustomize /usr/local/bin/

    - name: Validate plain manifests
      run: |
        kubeconform -strict -summary \
          -kubernetes-version ${{ matrix.k8s-version }} \
          -output json \
          apps/

    - name: Validate Helm charts
      run: |
        for chart in charts/*/; do
          echo "Validating $chart..."
          helm template test "$chart" | \
            kubeconform -strict -summary \
            -kubernetes-version ${{ matrix.k8s-version }}
        done

    - name: Validate Kustomize overlays
      run: |
        for overlay in apps/*/overlays/*/; do
          echo "Validating $overlay..."
          kustomize build "$overlay" | \
            kubeconform -strict -summary \
            -kubernetes-version ${{ matrix.k8s-version }}
        done
```

## JUnit Output for CI Integration

kubeconform supports JUnit output format, which integrates with most CI systems' test reporting:

```bash
# Generate JUnit report
kubeconform -output junit -summary apps/my-app/production/ > test-results.xml
```

```yaml
# GitHub Actions with test reporting
- name: Validate and report
  run: |
    kubeconform -strict -output junit \
      -kubernetes-version 1.28.0 \
      apps/ > kubeconform-results.xml

- name: Publish test results
  uses: EnricoMi/publish-unit-test-result-action@v2
  if: always()
  with:
    files: kubeconform-results.xml
```

## Handling False Positives

Sometimes kubeconform flags valid configurations as errors. Common scenarios:

```bash
# Skip specific resources that use custom schemas
kubeconform -skip "Application,AppProject" apps/

# Ignore specific files
kubeconform -ignore-filename-pattern ".*test.*" apps/

# Skip missing schemas instead of failing
kubeconform -ignore-missing-schemas apps/
```

For more context on building comprehensive validation pipelines before ArgoCD deployment, see our guide on [testing ArgoCD application manifests locally](https://oneuptime.com/blog/post/2026-02-26-test-argocd-manifests-locally/view).

## Summary

kubeval and kubeconform validate Kubernetes manifests against API schemas, catching errors before ArgoCD attempts to deploy them. Use kubeconform for new projects as kubeval is deprecated. Always use strict mode to catch unknown fields. Validate against your actual Kubernetes version. Include CRD schema locations for custom resource validation. Integrate validation into CI pipelines to catch errors on pull requests. Generate JUnit reports for CI system test integration. This pre-deployment validation layer dramatically reduces sync failures in ArgoCD.
