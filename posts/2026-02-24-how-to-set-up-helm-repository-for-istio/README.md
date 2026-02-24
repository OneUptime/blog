# How to Set Up Helm Repository for Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Helm, Kubernetes, Repository, DevOps

Description: Step-by-step guide for setting up and managing Helm repositories for Istio chart installation and version management.

---

Getting Istio installed through Helm starts with setting up the right repository. The official Istio project publishes Helm charts to a dedicated repository, and once you have it configured properly, installing and upgrading Istio becomes a straightforward process. But there are some nuances around versioning, air-gapped environments, and private mirrors that are worth understanding.

This guide covers everything from basic repository setup to running your own mirror for production use.

## Adding the Official Istio Helm Repository

The Istio project hosts its Helm charts at a Google Cloud Storage bucket. Add it to your local Helm configuration:

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts
```

After adding the repo, fetch the latest chart index:

```bash
helm repo update
```

Verify the repository was added correctly by searching for available charts:

```bash
helm search repo istio
```

You should see output like:

```
NAME            CHART VERSION   APP VERSION   DESCRIPTION
istio/base      1.22.0          1.22.0        Istio Base Chart
istio/istiod    1.22.0          1.22.0        Istio Control Plane
istio/gateway   1.22.0          1.22.0        Istio Gateway
istio/cni       1.22.0          1.22.0        Istio CNI Plugin
```

## Viewing Available Versions

To see all available versions of a specific chart (not just the latest):

```bash
helm search repo istio/istiod --versions
```

This is useful when you need to install a specific version or check what is available for an upgrade. The output lists every published chart version along with the corresponding Istio version.

If you only want to see versions in a certain range:

```bash
helm search repo istio/istiod --versions --version ">=1.20.0 <1.22.0"
```

## Inspecting Chart Details

Before installing, it is good practice to inspect the chart. You can pull the chart info without installing it:

```bash
helm show chart istio/istiod --version 1.22.0
```

To see all the configurable values:

```bash
helm show values istio/istiod --version 1.22.0
```

This dumps the complete `values.yaml` for that chart version. Pipe it to a file if you want a starting point for your custom configuration:

```bash
helm show values istio/istiod --version 1.22.0 > istiod-values.yaml
```

## Downloading Charts Locally

Sometimes you want to download the chart without installing it. Maybe you need to review the templates, or you are preparing for an air-gapped deployment:

```bash
helm pull istio/istiod --version 1.22.0
```

This downloads a `.tgz` file to your current directory. To extract it:

```bash
helm pull istio/istiod --version 1.22.0 --untar
```

Now you have the full chart directory structure locally and can browse through the templates, helpers, and default values.

## Setting Up a Private Helm Repository

In production environments, you probably do not want to pull charts directly from the internet during deployments. A private repository gives you control over which versions are available and adds a layer of reliability.

### Using ChartMuseum

ChartMuseum is a popular open-source Helm chart repository server. Deploy it to your cluster:

```bash
helm repo add chartmuseum https://chartmuseum.github.io/charts
helm install chartmuseum chartmuseum/chartmuseum \
  --set env.open.STORAGE=local \
  --set persistence.enabled=true \
  --set persistence.size=10Gi \
  -n chartmuseum \
  --create-namespace
```

Once it is running, mirror the Istio charts to it. First, download the charts you need:

```bash
helm pull istio/base --version 1.22.0
helm pull istio/istiod --version 1.22.0
helm pull istio/gateway --version 1.22.0
helm pull istio/cni --version 1.22.0
```

Then push them to ChartMuseum:

```bash
curl --data-binary "@base-1.22.0.tgz" \
  http://chartmuseum.example.com/api/charts

curl --data-binary "@istiod-1.22.0.tgz" \
  http://chartmuseum.example.com/api/charts

curl --data-binary "@gateway-1.22.0.tgz" \
  http://chartmuseum.example.com/api/charts
```

Add your private repository to Helm:

```bash
helm repo add istio-private http://chartmuseum.example.com
helm repo update
```

### Using OCI Registry

Helm 3 supports OCI registries natively, which means you can store charts in the same container registry you use for images:

```bash
helm pull istio/istiod --version 1.22.0

helm push istiod-1.22.0.tgz oci://registry.example.com/helm-charts
```

To install from an OCI registry:

```bash
helm install istiod oci://registry.example.com/helm-charts/istiod \
  --version 1.22.0 \
  -n istio-system
```

OCI-based repositories are nice because you likely already have a container registry running and do not need another piece of infrastructure.

## Air-Gapped Environment Setup

For environments without internet access, you need to pre-download everything. Create a script that pulls all needed charts:

```bash
#!/bin/bash
ISTIO_VERSION="1.22.0"
CHARTS=("base" "istiod" "gateway" "cni")
OUTPUT_DIR="./istio-charts"

mkdir -p "$OUTPUT_DIR"

for chart in "${CHARTS[@]}"; do
  helm pull "istio/${chart}" \
    --version "$ISTIO_VERSION" \
    --destination "$OUTPUT_DIR"
done

echo "Downloaded charts:"
ls -la "$OUTPUT_DIR"
```

Transfer the `istio-charts` directory to your air-gapped environment and install from local files:

```bash
helm install istio-base ./istio-charts/base-1.22.0.tgz \
  -n istio-system --create-namespace

helm install istiod ./istio-charts/istiod-1.22.0.tgz \
  -n istio-system \
  -f istiod-values.yaml

helm install istio-ingress ./istio-charts/gateway-1.22.0.tgz \
  -n istio-ingress --create-namespace
```

## Managing Multiple Repository Sources

You might have the official repo for testing new versions and a private repo for production deployments. Helm handles this through repo naming:

```bash
helm repo add istio-official https://istio-release.storage.googleapis.com/charts
helm repo add istio-approved oci://registry.example.com/helm-charts
```

Install from whichever source is appropriate:

```bash
# Testing with latest official release
helm install istiod istio-official/istiod -n istio-system

# Production with approved version
helm install istiod oci://registry.example.com/helm-charts/istiod \
  --version 1.22.0 -n istio-system
```

## Automating Repository Updates

In a CI/CD pipeline, always run `helm repo update` before any install or upgrade operation to make sure you have the latest chart index:

```bash
helm repo update istio
```

You can update a single repo by name instead of all repos. This is faster and avoids unnecessary network calls.

## Troubleshooting Repository Issues

If `helm repo update` fails, check a few things:

```bash
# List all configured repos
helm repo list

# Remove and re-add a problematic repo
helm repo remove istio
helm repo add istio https://istio-release.storage.googleapis.com/charts
```

If you get certificate errors when adding a repo behind a corporate proxy:

```bash
helm repo add istio https://istio-release.storage.googleapis.com/charts \
  --ca-file /path/to/ca-cert.pem
```

For authentication with a private repo:

```bash
helm repo add istio-private https://charts.example.com \
  --username admin \
  --password secretpassword
```

Setting up your Helm repository properly is the foundation for reliable Istio management. Whether you use the official repo directly, mirror to a private ChartMuseum instance, or store charts in an OCI registry, having a well-organized repository strategy saves you from deployment headaches down the road.
