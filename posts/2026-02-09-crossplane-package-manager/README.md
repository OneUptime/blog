# The Crossplane Package Manager for Distributing and Installing Configurations

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Crossplane, Package Manager, Kubernetes, Infrastructure as Code, Configuration

Description: Understanding the Crossplane package manager system for building, distributing, and installing reusable infrastructure configurations and providers

---

As organizations adopt Crossplane for infrastructure management, the need to share and distribute configurations across teams and clusters grows rapidly. Writing Compositions and Composite Resource Definitions from scratch for every cluster is time-consuming and error-prone. The Crossplane package manager solves this by providing a system for bundling, versioning, distributing, and installing reusable infrastructure configurations. Built on OCI container registry standards, it lets you treat infrastructure definitions like container images, pushing them to registries and pulling them into any Crossplane-enabled cluster.

## Package Types in Crossplane

Crossplane supports two primary package types:

**Providers** are packages that install new managed resource types into your cluster. They contain CRDs for cloud resources and the controllers that reconcile them. For example, `provider-aws` adds CRDs for EC2 instances, RDS databases, S3 buckets, and hundreds of other AWS resources.

**Configurations** are packages that install Composite Resource Definitions (XRDs) and Compositions. They define your platform API and how it maps to underlying managed resources. Configurations can depend on providers and on other configurations.

There is also a third type called **Functions** that packages Composition Functions, which are custom logic for transforming resources during composition.

## Package Structure

A Crossplane package is an OCI image with a specific directory structure. At its core, every package contains a `crossplane.yaml` metadata file and the Kubernetes manifests it installs.

For a Configuration package:

```text
my-platform/
├── crossplane.yaml
├── apis/
│   ├── definition.yaml      # CompositeResourceDefinition
│   ├── composition-aws.yaml # Composition for AWS
│   └── composition-gcp.yaml # Composition for GCP
└── examples/
    └── network-claim.yaml   # Example claim
```

The `crossplane.yaml` file is the package metadata:

```yaml
apiVersion: meta.pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-networking
  annotations:
    meta.crossplane.io/maintainer: "Platform Team <platform@example.com>"
    meta.crossplane.io/source: "github.com/example/platform-networking"
    meta.crossplane.io/license: "Apache-2.0"
    meta.crossplane.io/description: |
      Networking abstractions for multi-cloud deployments.
      Supports AWS VPC, GCP VPC, and Azure VNet.
    meta.crossplane.io/readme: |
      This configuration provides a unified Network API that
      provisions cloud-specific networking resources.
spec:
  crossplane:
    version: ">=v1.14.0"
  dependsOn:
    - apiVersion: pkg.crossplane.io/v1
      kind: Provider
      package: xpkg.upbound.io/upbound/provider-aws-ec2
      version: ">=v1.0.0"
    - apiVersion: pkg.crossplane.io/v1
      kind: Provider
      package: xpkg.upbound.io/upbound/provider-gcp-compute
      version: ">=v1.0.0"
    - apiVersion: pkg.crossplane.io/v1
      kind: Provider
      package: xpkg.upbound.io/upbound/provider-azure-network
      version: ">=v1.0.0"
```

For a Provider package:

```yaml
apiVersion: meta.pkg.crossplane.io/v1
kind: Provider
metadata:
  name: provider-custom-dns
spec:
  crossplane:
    version: ">=v1.14.0"
```

## Building Packages

Use the Crossplane CLI to build packages:

```bash
# Install the Crossplane CLI

curl -sL https://raw.githubusercontent.com/crossplane/crossplane/main/install.sh | sh
sudo mv crossplane /usr/local/bin/

# Build a configuration package
crossplane xpkg build \
  --package-root=./my-platform \
  --ignore="./examples/*" \
  --package-file=my-platform.xpkg

# Build with examples included
crossplane xpkg build \
  --package-root=./my-platform \
  --ignore="./examples/*" \
  --examples-root=./my-platform/examples \
  --package-file=my-platform.xpkg
```

The build process validates your manifests and creates an OCI-compliant image that can be pushed to any container registry.

## Publishing Packages

Push packages to an OCI registry:

```bash
# Login to the registry
docker login registry.example.com \
  --username=platform-team \
  --password-stdin < token.txt

# Push the package
crossplane xpkg push \
  registry.example.com/platform/networking:v1.0.0 \
  -f my-platform.xpkg
```

You can also push to the Upbound Marketplace, Docker Hub, or any OCI-compatible registry like GitHub Container Registry or Amazon ECR:

```bash
# Push to GitHub Container Registry
crossplane xpkg push \
  ghcr.io/my-org/platform-networking:v1.0.0 \
  -f my-platform.xpkg

# Push to Amazon ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com

crossplane xpkg push \
  123456789.dkr.ecr.us-east-1.amazonaws.com/platform-networking:v1.0.0 \
  -f my-platform.xpkg
```

## Installing Packages

Install a Configuration package on a Crossplane cluster:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-networking
spec:
  package: registry.example.com/platform/networking:v1.0.0
  packagePullPolicy: IfNotPresent
  revisionActivationPolicy: Automatic
  revisionHistoryLimit: 3
```

For private registries, create an image pull secret:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: registry-credentials
  namespace: crossplane-system
type: kubernetes.io/dockerconfigjson
data:
  .dockerconfigjson: <base64-encoded-docker-config>
---
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-networking
spec:
  package: registry.example.com/platform/networking:v1.0.0
  packagePullSecrets:
    - name: registry-credentials
```

Check installation status:

```bash
kubectl get configuration
# NAME                  INSTALLED   HEALTHY   PACKAGE                                              AGE
# platform-networking   True        True      registry.example.com/platform/networking:v1.0.0      2m

# View installed revisions
kubectl get configurationrevision
# NAME                         HEALTHY   REVISION   IMAGE                                                STATE
# platform-networking-abc123   True      1          registry.example.com/platform/networking:v1.0.0      Active
```

## Dependency Resolution

When you install a Configuration, Crossplane automatically resolves and installs its dependencies. If your Configuration depends on specific provider versions, those providers are installed automatically:

```bash
# After installing platform-networking, providers are installed automatically
kubectl get providers
# NAME                         INSTALLED   HEALTHY   PACKAGE
# upbound-provider-aws-ec2     True        True      xpkg.upbound.io/upbound/provider-aws-ec2:v1.2.0
# upbound-provider-gcp-compute True        True      xpkg.upbound.io/upbound/provider-gcp-compute:v1.2.0
# upbound-provider-azure-net   True        True      xpkg.upbound.io/upbound/provider-azure-network:v1.2.0
```

Dependency version constraints follow semantic versioning. You can specify exact versions, version ranges, or minimum versions:

```yaml
spec:
  dependsOn:
    - apiVersion: pkg.crossplane.io/v1
      kind: Provider
      package: xpkg.upbound.io/upbound/provider-aws-ec2
      version: ">=v1.0.0 <v2.0.0"    # Any 1.x version
    - apiVersion: pkg.crossplane.io/v1
      kind: Configuration
      package: registry.example.com/platform/base
      version: "v1.2.x"              # Any 1.2.x patch version
```

## Package Revisions

Crossplane maintains a history of package revisions, enabling safe upgrades and rollbacks:

```bash
# List all revisions
kubectl get configurationrevision

# View revision details
kubectl describe configurationrevision platform-networking-abc123
```

When you update the package version, a new revision is created:

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-networking
spec:
  package: registry.example.com/platform/networking:v1.1.0  # Updated version
  revisionActivationPolicy: Automatic
  revisionHistoryLimit: 3
```

With `revisionActivationPolicy: Automatic`, the new revision becomes active immediately. Set it to `Manual` for controlled rollouts where you explicitly activate new revisions.

## Composing Configurations

Large platforms benefit from composing multiple configurations together. Create a meta-configuration that depends on smaller, focused configurations:

```yaml
apiVersion: meta.pkg.crossplane.io/v1
kind: Configuration
metadata:
  name: platform-complete
spec:
  crossplane:
    version: ">=v1.14.0"
  dependsOn:
    - apiVersion: pkg.crossplane.io/v1
      kind: Configuration
      package: registry.example.com/platform/networking
      version: ">=v1.0.0"
    - apiVersion: pkg.crossplane.io/v1
      kind: Configuration
      package: registry.example.com/platform/databases
      version: ">=v1.0.0"
    - apiVersion: pkg.crossplane.io/v1
      kind: Configuration
      package: registry.example.com/platform/kubernetes-clusters
      version: ">=v1.0.0"
    - apiVersion: pkg.crossplane.io/v1
      kind: Configuration
      package: registry.example.com/platform/observability
      version: ">=v1.0.0"
```

## CI/CD for Packages

Automate package building and publishing in your CI/CD pipeline:

```yaml
# .github/workflows/release.yaml
name: Release Configuration
on:
  push:
    tags:
      - 'v*'
jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install Crossplane CLI
        run: |
          curl -sL https://raw.githubusercontent.com/crossplane/crossplane/main/install.sh | sh
          sudo mv crossplane /usr/local/bin/
      - name: Build package
        run: |
          crossplane xpkg build \
            --package-root=. \
            --ignore="./examples/*" \
            --package-file=package.xpkg
      - name: Push package
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io \
            --username "${{ github.actor }}" \
            --password-stdin
          crossplane xpkg push \
            ghcr.io/${{ github.repository }}:${{ github.ref_name }} \
            -f package.xpkg
```

## Testing Packages Locally

Before publishing, test packages locally:

```bash
# Validate the package structure
crossplane xpkg build --package-root=. --ignore="./examples/*" --package-file=package.xpkg

# Install locally on a development cluster
kind create cluster
helm repo add crossplane-stable https://charts.crossplane.io/stable
helm repo update
helm install crossplane crossplane-stable/crossplane -n crossplane-system --create-namespace

# Install the package from a registry reachable by the cluster
crossplane xpkg install configuration registry.example.com/platform/networking:v1.0.0

# Verify XRDs and Compositions are installed
kubectl get xrd
kubectl get composition
```

## Conclusion

The Crossplane package manager brings the same distribution and versioning capabilities to infrastructure definitions that container registries brought to application images. By packaging your Compositions and XRDs into versioned, distributable units, you can share infrastructure abstractions across teams and clusters with confidence. The dependency resolution system ensures providers and dependent configurations are automatically installed, while revision management enables safe upgrades and rollbacks. Combined with CI/CD automation, the package manager creates a complete lifecycle for infrastructure-as-code that fits naturally into existing container-based workflows.
