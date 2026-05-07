# How to Store Helm Charts as OCI Artifacts with Podman

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Podman, Container, DevOps, OCI Artifacts, Helm, Kubernetes

Description: Learn how to store, push, and pull Helm charts as OCI artifacts using Podman and OCI-compliant registries.

---

> Storing Helm charts as OCI artifacts in container registries eliminates the need for a dedicated Helm chart repository, unifying your Kubernetes deployment assets in one place.

Helm 3 introduced experimental support for storing charts as OCI artifacts, and this capability is now stable. With Podman, you can manage Helm chart packages as OCI artifacts in your local store and push them to any OCI-compliant registry. This unifies your container images and Helm charts in the same infrastructure. This post walks through the complete workflow.

---

## Prerequisites

You need Podman 5.5 or later and Helm 3.8 or later.

```bash
# Verify Podman version

podman --version

# Verify Helm version
helm version

# Ensure Helm OCI support is enabled (stable since Helm 3.8)
helm registry --help
```

## Creating a Sample Helm Chart

Start by creating a Helm chart to work with.

```bash
# Create a new Helm chart
helm create mywebapp

# View the chart structure
ls -la mywebapp/
```

This creates a standard chart with templates, values, and a Chart.yaml.

## Packaging the Helm Chart

Package the chart into a `.tgz` archive.

```bash
# Package the Helm chart
helm package mywebapp/

# This creates a file like mywebapp-0.1.0.tgz
ls -la mywebapp-*.tgz
```

## Storing the Chart as an OCI Artifact with Podman

Add the packaged chart to the Podman artifact store.

```bash
# Add the Helm chart package as an OCI artifact
podman artifact add \
    --type "application/vnd.cncf.helm.config.v1+json" \
    --file-type "application/vnd.cncf.helm.chart.content.v1.tar+gzip" \
    registry.example.com/myorg/charts/mywebapp:0.1.0 \
    mywebapp-0.1.0.tgz

# Verify the artifact was added
podman artifact ls | grep mywebapp

# Inspect the artifact metadata
podman artifact inspect registry.example.com/myorg/charts/mywebapp:0.1.0 | python3 -m json.tool
```

The `--type` flag sets the Helm chart artifact type, and `--file-type` sets the standard Helm chart content layer type, ensuring compatibility with Helm and other OCI tooling.

## Pushing the Chart to a Registry

Push the chart artifact to a remote registry.

```bash
# Log in to the registry
podman login registry.example.com

# Push the Helm chart artifact
podman artifact push registry.example.com/myorg/charts/mywebapp:0.1.0

echo "Helm chart pushed to registry"
```

## Pulling the Chart from a Registry

On another machine or in a CI/CD pipeline, pull the chart.

```bash
# Pull the Helm chart artifact
podman artifact pull registry.example.com/myorg/charts/mywebapp:0.1.0

# Verify the pull
podman artifact ls | grep mywebapp
```

## Using Helm Native OCI Commands

Helm also has native OCI support. You can use both Helm and Podman to manage chart artifacts.

```bash
# Push a chart using Helm directly
helm push mywebapp-0.1.0.tgz oci://registry.example.com/myorg/charts

# Pull a chart using Helm
helm pull oci://registry.example.com/myorg/charts/mywebapp --version 0.1.0

# Install directly from OCI registry
helm install mywebapp oci://registry.example.com/myorg/charts/mywebapp --version 0.1.0
```

## Versioning Helm Chart Artifacts

Maintain multiple chart versions in the registry.

```bash
# Update the chart version in Chart.yaml
sed -i 's/version: 0.1.0/version: 0.2.0/' mywebapp/Chart.yaml

# Package the new version
helm package mywebapp/

# Add and push the new version
podman artifact add \
    --type "application/vnd.cncf.helm.config.v1+json" \
    --file-type "application/vnd.cncf.helm.chart.content.v1.tar+gzip" \
    registry.example.com/myorg/charts/mywebapp:0.2.0 \
    mywebapp-0.2.0.tgz

podman artifact push registry.example.com/myorg/charts/mywebapp:0.2.0
```

## Bundling Chart with Values Files

Distribute a chart along with environment-specific values files.

```bash
# Create environment values files
cat > values-production.yaml <<EOF
replicaCount: 3
image:
  tag: "v2.0"
resources:
  limits:
    cpu: "1"
    memory: "512Mi"
EOF

cat > values-staging.yaml <<EOF
replicaCount: 1
image:
  tag: "v2.0-rc1"
resources:
  limits:
    cpu: "500m"
    memory: "256Mi"
EOF

# Bundle chart and values together
podman artifact add registry.example.com/myorg/charts/mywebapp-bundle:0.2.0 \
    mywebapp-0.2.0.tgz values-production.yaml values-staging.yaml

podman artifact push registry.example.com/myorg/charts/mywebapp-bundle:0.2.0
```

## CI/CD Chart Release Pipeline

Automate chart packaging and pushing in a pipeline.

```bash
#!/bin/bash
# CI/CD script: package and publish Helm chart as OCI artifact

CHART_DIR="./mywebapp"
REGISTRY="registry.example.com"
CHART_REPO="myorg/charts"

# Extract chart name and version from Chart.yaml
CHART_NAME=$(grep '^name:' "${CHART_DIR}/Chart.yaml" | awk '{print $2}')
CHART_VERSION=$(grep '^version:' "${CHART_DIR}/Chart.yaml" | awk '{print $2}')

echo "Publishing ${CHART_NAME} version ${CHART_VERSION}..."

# Lint the chart
helm lint "$CHART_DIR"

# Package the chart
helm package "$CHART_DIR"

# Add to Podman artifact store
podman artifact add \
    --type "application/vnd.cncf.helm.config.v1+json" \
    --file-type "application/vnd.cncf.helm.chart.content.v1.tar+gzip" \
    "${REGISTRY}/${CHART_REPO}/${CHART_NAME}:${CHART_VERSION}" \
    "${CHART_NAME}-${CHART_VERSION}.tgz"

# Push to registry
podman artifact push "${REGISTRY}/${CHART_REPO}/${CHART_NAME}:${CHART_VERSION}"

echo "Chart ${CHART_NAME}:${CHART_VERSION} published successfully"
```

## Summary

Storing Helm charts as OCI artifacts with Podman unifies your container images and Kubernetes deployment charts in a single registry. You package charts with `helm package`, add them to the Podman artifact store with the correct Helm media types, and push them to any OCI-compliant registry. Charts can be versioned with semantic-version tags, bundled with values files, and distributed through CI/CD pipelines. Both Podman and Helm native OCI commands can work with the same chart artifacts, giving you flexibility in how you manage and consume them.
