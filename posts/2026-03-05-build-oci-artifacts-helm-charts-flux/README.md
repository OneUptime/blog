# How to Build OCI Artifacts from Helm Charts with Flux

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Flux CD, GitOps, Kubernetes, OCI, Helm, Helm Chart

Description: Learn how to package Helm charts as OCI artifacts and deploy them using Flux CD's HelmRepository OCI support and OCIRepository.

---

## Introduction

Helm charts have long been distributed via HTTP-based chart repositories. With OCI support now stable in Helm v3 and Flux CD, you can push Helm charts to any OCI-compatible container registry and have Flux pull them directly. This unifies your artifact storage -- container images and Helm charts live in the same registry -- and gives you the benefits of OCI distribution: content-addressable layers, efficient caching, and signature verification.

This guide covers packaging Helm charts as OCI artifacts, pushing them to a registry, and configuring Flux to consume them.

## Prerequisites

- A Kubernetes cluster with Flux CD installed (v2.3 or later)
- The `flux` CLI and `helm` CLI (v3.8 or later) installed
- An OCI-compatible container registry
- `kubectl` configured to access your cluster

## Step 1: Package Your Helm Chart

Start with a standard Helm chart structure.

```bash
# Typical Helm chart directory structure

tree charts/myapp/
# charts/myapp/
# ├── Chart.yaml
# ├── values.yaml
# └── templates/
#     ├── deployment.yaml
#     ├── service.yaml
#     └── _helpers.tpl
```

Here is a sample Chart.yaml.

```yaml
# charts/myapp/Chart.yaml
apiVersion: v2
name: myapp
description: A sample application Helm chart
version: 1.2.0
appVersion: "2.0.0"
type: application
```

Package the chart into a `.tgz` archive.

```bash
# Package the Helm chart
helm package charts/myapp/
# Creates myapp-1.2.0.tgz in the current directory
```

## Step 2: Push the Helm Chart to an OCI Registry Using Helm

Helm v3 natively supports pushing charts to OCI registries.

```bash
# Log in to the OCI registry
helm registry login registry.example.com \
  --username=admin \
  --password=$REGISTRY_PASSWORD

# Push the packaged chart to the OCI registry
helm push myapp-1.2.0.tgz oci://registry.example.com/charts
```

This pushes the chart to `registry.example.com/charts/myapp` with the tag `1.2.0`.

Verify the chart is available.

```bash
# Verify the chart was pushed successfully
helm show chart oci://registry.example.com/charts/myapp --version 1.2.0
```

## Step 3: Alternative -- Push Rendered Manifests Using the Flux CLI

You can also render the chart and push the generated Kubernetes manifests as a Flux OCI artifact. This is useful when you want to distribute ready-to-apply manifests with Flux's metadata tagging.

```bash
# Render the Helm chart to plain Kubernetes manifests
mkdir -p ./dist/myapp
helm template myapp ./charts/myapp \
  --values ./charts/myapp/values.yaml \
  > ./dist/myapp/manifests.yaml

# Push the rendered manifests as a Flux OCI artifact
flux push artifact oci://registry.example.com/flux-manifests/myapp:1.2.0 \
  --path=./dist/myapp \
  --source="$(git config --get remote.origin.url)" \
  --revision="main@sha1:$(git rev-parse HEAD)"
```

## Step 4: Configure Flux HelmRepository with OCI

Flux supports OCI-based Helm repositories through the HelmRepository resource with `type: oci`. This API is supported, but for new Flux versions the OCIRepository approach in Step 6 is recommended for improved Helm OCI support.

```yaml
# helmrepository-oci.yaml -- HelmRepository pointing to an OCI registry
apiVersion: source.toolkit.fluxcd.io/v1
kind: HelmRepository
metadata:
  name: myapp-charts
  namespace: flux-system
spec:
  type: oci
  interval: 5m
  url: oci://registry.example.com/charts
  secretRef:
    name: registry-auth
```

Create the registry authentication secret.

```bash
# Create authentication secret for the OCI registry
kubectl create secret docker-registry registry-auth \
  --namespace=flux-system \
  --docker-server=registry.example.com \
  --docker-username=admin \
  --docker-password=$REGISTRY_PASSWORD
```

Apply the HelmRepository.

```bash
# Apply the HelmRepository resource
kubectl apply -f helmrepository-oci.yaml
```

## Step 5: Create a HelmRelease

Deploy the chart using a HelmRelease that references the OCI-based HelmRepository.

```yaml
# helmrelease-myapp.yaml -- HelmRelease using OCI HelmRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: default
spec:
  interval: 10m
  chart:
    spec:
      chart: myapp
      version: "1.2.0"
      sourceRef:
        kind: HelmRepository
        name: myapp-charts
        namespace: flux-system
  values:
    replicaCount: 3
    image:
      repository: registry.example.com/myapp
      tag: "2.0.0"
    service:
      type: ClusterIP
      port: 80
```

Apply the HelmRelease.

```bash
# Apply the HelmRelease
kubectl apply -f helmrelease-myapp.yaml
```

## Step 6: Alternative -- Use OCIRepository with HelmRelease

If you pushed the packaged chart using `helm push` (Step 2), you can use an OCIRepository source instead of HelmRepository and reference it directly from a HelmRelease.

```yaml
# ocirepository-helm.yaml -- OCIRepository for a Helm chart artifact
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: myapp-chart
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/charts/myapp
  layerSelector:
    mediaType: "application/vnd.cncf.helm.chart.content.v1.tar+gzip"
    operation: copy
  ref:
    semver: ">=1.0.0"
  secretRef:
    name: registry-auth
---
# HelmRelease that deploys the chart from the OCIRepository
apiVersion: helm.toolkit.fluxcd.io/v2
kind: HelmRelease
metadata:
  name: myapp
  namespace: default
spec:
  interval: 10m
  chartRef:
    kind: OCIRepository
    name: myapp-chart
    namespace: flux-system
  values:
    replicaCount: 3
    image:
      repository: registry.example.com/myapp
      tag: "2.0.0"
    service:
      type: ClusterIP
      port: 80
```

If you pushed rendered manifests using `flux push artifact` (Step 3), use an OCIRepository with a Kustomization instead.

```yaml
# ocirepository-manifests.yaml -- OCIRepository for rendered manifests
apiVersion: source.toolkit.fluxcd.io/v1
kind: OCIRepository
metadata:
  name: myapp-manifests
  namespace: flux-system
spec:
  interval: 5m
  url: oci://registry.example.com/flux-manifests/myapp
  ref:
    semver: ">=1.0.0"
  secretRef:
    name: registry-auth
---
# Kustomization that applies the rendered manifests
apiVersion: kustomize.toolkit.fluxcd.io/v1
kind: Kustomization
metadata:
  name: myapp-manifests
  namespace: flux-system
spec:
  interval: 10m
  sourceRef:
    kind: OCIRepository
    name: myapp-manifests
  path: ./
  prune: true
```

Note that when using OCIRepository with rendered manifests, the Kustomize controller applies the manifests directly and does not perform Helm templating. For proper Helm templating with values, use HelmRelease with either the HelmRepository approach from Steps 4 and 5 or the OCIRepository chart reference shown above.

## CI Pipeline Example

Automate chart packaging and pushing in your CI pipeline.

```yaml
# .github/workflows/helm-push.yaml -- Push Helm chart to OCI registry
name: Push Helm Chart
on:
  push:
    branches: [main]
    paths: ["charts/**"]

jobs:
  push-chart:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Helm
        uses: azure/setup-helm@v3

      - name: Login to OCI registry
        run: |
          helm registry login registry.example.com \
            --username=ci-user \
            --password=${{ secrets.REGISTRY_PASSWORD }}

      - name: Package and push chart
        run: |
          # Package the chart
          helm package charts/myapp/

          # Extract version from Chart.yaml
          VERSION=$(grep '^version:' charts/myapp/Chart.yaml | awk '{print $2}')

          # Push to OCI registry
          helm push "myapp-${VERSION}.tgz" oci://registry.example.com/charts
```

## Verify the Deployment

Check the status of all Flux resources.

```bash
# Check HelmRepository status
flux get sources helm

# Check HelmRelease status
flux get helmreleases -A

# Check the deployed Helm release
helm list -n default
```

## Comparison: HelmRepository OCI vs. OCIRepository

| Feature | HelmRepository (type: oci) | OCIRepository |
|---------|---------------------------|---------------|
| Chart source | Standard Helm OCI chart | Standard Helm OCI chart or any OCI artifact |
| Deployment method | HelmRelease (Helm install/upgrade) | HelmRelease with `chartRef` for charts, or Kustomization for rendered manifests |
| Values support | Full Helm values, value overrides | Full Helm values with HelmRelease; no Helm templating with Kustomization |
| Chart hooks | Supported | Supported with HelmRelease; not supported with Kustomization |
| Best for | Existing HelmRepository workflows | Recommended Flux workflow for Helm charts in OCI, or raw manifests pushed via `flux push artifact` |

For Helm charts, use HelmRepository with `type: oci` and HelmRelease, or OCIRepository with HelmRelease `chartRef`. Both preserve the full Helm lifecycle including templating, values, hooks, and rollback.

## Conclusion

Packaging Helm charts as OCI artifacts with Flux CD unifies your artifact storage and streamlines distribution. Using HelmRepository with `type: oci`, you get native Helm chart management backed by OCI registries. The combination of Helm's `helm push` command, Flux's HelmRelease, and a CI pipeline creates an automated workflow from chart development to cluster deployment. This approach eliminates the need for separate chart repository servers and leverages the same registry infrastructure used for container images.
