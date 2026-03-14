# How to Configure Helm Chart Build and Push in CI for Flux CD

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, Helm, CI/CD, GitOps, HelmRepository, OCI, Chart Registry

Description: Learn how to build, package, and push Helm charts in CI pipelines so Flux CD HelmRepository or OCIRepository sources can automatically deploy updated chart versions.

---

## Introduction

When you own the Helm chart for your application, you need a CI pipeline that packages the chart, bumps the chart version, and pushes it to a chart registry. Flux CD can then detect the new chart version through a HelmRepository or OCIRepository source and trigger a HelmRelease reconciliation.

Two approaches exist for distributing Helm charts: the traditional HTTP-based HelmRepository (serving `index.yaml`), and the modern OCI-based approach where charts are pushed as OCI artifacts to a container registry. Flux CD supports both. OCI is increasingly preferred because it reuses existing container registry infrastructure and provides stronger provenance guarantees.

This guide covers building and pushing Helm charts in CI using both approaches, and wiring them up with the appropriate Flux CD sources.

## Prerequisites

- A Kubernetes cluster with Flux CD bootstrapped
- A Helm chart repository (GitHub Pages, ChartMuseum, or OCI registry)
- `helm` CLI version 3.8+ (for OCI support)
- CI system with Helm installed (GitHub Actions examples used)
- `flux` CLI for verification

## Step 1: Structure Your Helm Chart

```
charts/
  myapp/
    Chart.yaml
    values.yaml
    templates/
      deployment.yaml
      service.yaml
      ingress.yaml
      _helpers.tpl
```

Example `Chart.yaml`:

```yaml
apiVersion: v2
name: myapp
description: A Helm chart for myapp
type: application
version: 0.1.0      # Chart version - increment this in CI
appVersion: "1.0.0" # Application version
```

## Step 2: CI Pipeline for OCI Chart Push (Recommended)

```yaml
# .github/workflows/helm-release.yml
name: Helm Chart Release

on:
  push:
    tags:
      - 'chart-v*'

env:
  REGISTRY: ghcr.io
  CHART_REPO: your-org/charts

jobs:
  helm-release:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Helm
        uses: azure/setup-helm@v3
        with:
          version: '3.14.0'

      - name: Extract chart version from tag
        id: version
        run: |
          # Tag format: chart-v0.1.0 -> 0.1.0
          VERSION=${GITHUB_REF_NAME#chart-v}
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Update Chart.yaml version
        run: |
          sed -i "s/^version: .*/version: ${{ steps.version.outputs.version }}/" charts/myapp/Chart.yaml

      - name: Run chart tests
        run: |
          helm lint charts/myapp/
          helm template myapp charts/myapp/ | kubectl apply --dry-run=client -f -

      - name: Log in to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | helm registry login ghcr.io \
            --username ${{ github.actor }} \
            --password-stdin

      - name: Package and push chart to OCI
        run: |
          helm package charts/myapp/ --version ${{ steps.version.outputs.version }}
          helm push myapp-${{ steps.version.outputs.version }}.tgz \
            oci://${{ env.REGISTRY }}/${{ env.CHART_REPO }}
```

## Step 3: CI Pipeline for Traditional HTTP HelmRepository

For teams using ChartMuseum or GitHub Pages:

```yaml
      - name: Package chart
        run: |
          helm package charts/myapp/ --version ${{ steps.version.outputs.version }}

      - name: Push to ChartMuseum
        run: |
          curl --data-binary "@myapp-${{ steps.version.outputs.version }}.tgz" \
            -H "Authorization: Basic $(echo -n $CHART_USER:$CHART_PASS | base64)" \
            https://charts.your-org.com/api/charts
        env:
          CHART_USER: ${{ secrets.CHART_USER }}
          CHART_PASS: ${{ secrets.CHART_PASS }}
```

## Step 4: Configure Flux OCIRepository Source

```yaml
# clusters/production/sources/myapp-chart.yaml
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: myapp-chart
  namespace: flux-system
spec:
  interval: 5m
  url: oci://ghcr.io/your-org/charts/myapp
  ref:
    semver: ">=0.1.0"
  secretRef:
    name: ghcr-auth
```

## Step 5: Configure the HelmRelease

```yaml
# clusters/production/apps/myapp-helmrelease.yaml
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: myapp
spec:
  interval: 10m
  chart:
    spec:
      chart: myapp
      version: ">=0.1.0"
      sourceRef:
        kind: OCIRepository
        name: myapp-chart
        namespace: flux-system
  values:
    replicaCount: 2
    image:
      repository: ghcr.io/your-org/myapp
      tag: "1.0.0"
    resources:
      requests:
        cpu: 100m
        memory: 128Mi
      limits:
        cpu: 500m
        memory: 256Mi
  upgrade:
    remediation:
      retries: 3
  rollback:
    timeout: 5m
    cleanupOnFail: true
```

## Step 6: Verify the Chart Deployment

```bash
# Check the OCIRepository is syncing
flux get sources oci myapp-chart -n flux-system

# Check the HelmRelease reconciled
flux get helmreleases myapp -n myapp

# View the deployed chart version
helm list -n myapp

# Get detailed HelmRelease status
kubectl describe helmrelease myapp -n myapp
```

## Best Practices

- Version your charts independently from your application using a `chart-v*` tag convention so chart and app releases can be decoupled.
- Run `helm lint` and `helm template | kubectl apply --dry-run=client` in CI to catch rendering errors before pushing.
- Use OCI registries over HTTP chart repositories when possible; they support authentication, signing, and provenance natively.
- Sign charts with Cosign in CI to enable Flux CD's OCI verification feature for supply chain security.
- Store chart values overrides in the fleet repository as `HelmRelease.spec.values` to keep environment-specific config in Git.
- Use `HelmRelease.spec.upgrade.remediation.retries` to handle transient upgrade failures gracefully.

## Conclusion

Building and pushing Helm charts in CI creates a clean artifact promotion path that Flux CD can track through OCIRepository or HelmRepository sources. The OCI approach is modern, secure, and reuses registry infrastructure, while traditional HTTP repositories remain valid for teams using ChartMuseum or hosted chart services.
