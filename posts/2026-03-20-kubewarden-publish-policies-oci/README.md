# How to Publish Custom Kubewarden Policies to OCI Registries

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubewarden, Kubernetes, OCI, Policy, Distribution

Description: Learn how to package, annotate, and publish custom Kubewarden policies to OCI-compatible container registries for distribution and reuse across your organization.

## Introduction

Once you have written and tested a custom Kubewarden policy, the next step is publishing it to an OCI registry so it can be deployed to your clusters and shared with your team or the broader community. Kubewarden uses OCI registries (the same infrastructure as container images) to distribute policy Wasm modules, making distribution straightforward and familiar.

This guide covers the complete workflow: building, annotating, testing, tagging, and publishing Kubewarden policies to OCI registries.

## Prerequisites

- A built Kubewarden policy Wasm file
- `kwctl` CLI installed
- Access to an OCI registry that supports OCI artifacts (GHCR, Quay.io, Harbor, ECR, etc.)
- Docker or `regctl` for registry authentication

## Understanding Kubewarden OCI Artifacts

Kubewarden policies are stored in OCI registries as OCI artifacts (not container images). They follow the OCI Image Specification but use a custom media type that identifies them as Kubewarden policies. The artifact contains:
- The WebAssembly binary
- Policy metadata (rules, execution settings, documentation)
- Annotations with policy details

## Step 1: Build Your Policy

```bash
# Choose the build command that matches your policy language

# Rust policy

cargo build --target wasm32-wasip1 --release
WASM_FILE="target/wasm32-wasip1/release/my_policy.wasm"

# Go policy
tinygo build -target wasi -o policy.wasm .
WASM_FILE="policy.wasm"

# Verify the Wasm file exists and check its size
ls -lh "${WASM_FILE}"
```

## Step 2: Create Policy Metadata

The `metadata.yml` file describes your policy and becomes embedded in the OCI artifact:

````yaml
# metadata.yml - Complete policy metadata
rules:
  - apiGroups: [""]
    apiVersions: ["v1"]
    resources: ["pods"]
    operations:
      - CREATE
      - UPDATE

# Whether this policy modifies resources
mutating: false

# Whether this policy needs Kubernetes API access
contextAware: false

# Execution mode (use kubewarden-wapc for standard policies)
executionMode: kubewarden-wapc

# Policy annotations
annotations:
  # Required annotations
  io.kubewarden.policy.title: "My Custom Policy"
  io.kubewarden.policy.description: |
    This policy enforces custom organizational security requirements.
    It validates that all pods meet our internal standards.

  # Author and source
  io.kubewarden.policy.author: "Platform Team <platform@example.com>"
  io.kubewarden.policy.url: "https://github.com/my-org/my-kubewarden-policies"
  io.kubewarden.policy.source: "https://github.com/my-org/my-kubewarden-policies"

  # Categorization
  io.kubewarden.policy.category: "Pod Security"
  io.kubewarden.policy.severity: "medium"

  # License
  io.kubewarden.policy.license: "Apache-2.0"

  # Version history (semantic versioning)
  io.kubewarden.policy.version: "v0.1.0"

  # Documentation
  io.kubewarden.policy.usage: |
    Deploy this policy with the following settings:
    ```yaml
    settings:
      requiredAnnotations:
        - team
        - cost-center
    ```

````

## Step 3: Annotate the Wasm Module

```bash
# Annotate the Wasm file with the metadata
kwctl annotate \
  "${WASM_FILE}" \
  --metadata-path metadata.yml \
  --output-path annotated-policy.wasm

# Verify the annotation was applied
kwctl inspect annotated-policy.wasm
```

## Step 4: Test the Annotated Policy

```bash
# Run tests on the annotated policy
kwctl run \
  --request-path tests/valid-request.json \
  annotated-policy.wasm

kwctl run \
  --request-path tests/invalid-request.json \
  annotated-policy.wasm

# Run with explicit settings
kwctl run \
  --request-path tests/valid-request.json \
  --settings-json '{"requiredAnnotations": ["team"]}' \
  annotated-policy.wasm
```

## Step 5: Push to an OCI Registry

### Quay.io

```bash
# Login to Quay.io
docker login quay.io

# Push to Quay.io
kwctl push \
  annotated-policy.wasm \
  registry://quay.io/my-org/my-custom-policy:v0.1.0

# Push with latest tag as well
kwctl push \
  annotated-policy.wasm \
  registry://quay.io/my-org/my-custom-policy:latest
```

### GitHub Container Registry (GHCR)

```bash
# Login to GHCR
echo "${GITHUB_TOKEN}" | docker login ghcr.io \
  --username "${GITHUB_USERNAME}" \
  --password-stdin

# Push to GHCR
kwctl push \
  annotated-policy.wasm \
  registry://ghcr.io/my-org/my-custom-policy:v0.1.0
```

### Amazon ECR

```bash
# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login \
  --username AWS \
  --password-stdin \
  123456789.dkr.ecr.us-east-1.amazonaws.com

# Create the ECR repository if it doesn't exist
if ! aws ecr describe-repositories \
  --repository-names kubewarden-policies/my-custom-policy \
  --region us-east-1 >/dev/null 2>&1; then
  aws ecr create-repository \
    --repository-name kubewarden-policies/my-custom-policy \
    --region us-east-1
fi

# Push to ECR
kwctl push \
  annotated-policy.wasm \
  registry://123456789.dkr.ecr.us-east-1.amazonaws.com/kubewarden-policies/my-custom-policy:v0.1.0
```

### Private Harbor Registry

```bash
# Login to Harbor
docker login harbor.internal.example.com

# Create the project in Harbor (via UI or API)
# Project: kubewarden-policies

# Push to Harbor
kwctl push \
  annotated-policy.wasm \
  registry://harbor.internal.example.com/kubewarden-policies/my-custom-policy:v0.1.0
```

## Step 6: Verify the Published Policy

```bash
# Pull and inspect the published policy
kwctl pull \
  registry://ghcr.io/my-org/my-custom-policy:v0.1.0

# Inspect the pulled policy
kwctl inspect \
  registry://ghcr.io/my-org/my-custom-policy:v0.1.0

# Get the Kubewarden manifest for deployment
kwctl scaffold manifest \
  --type ClusterAdmissionPolicy \
  registry://ghcr.io/my-org/my-custom-policy:v0.1.0
```

## Step 7: Deploy the Published Policy

```yaml
# deploy-custom-policy.yaml
apiVersion: policies.kubewarden.io/v1
kind: ClusterAdmissionPolicy
metadata:
  name: my-org-custom-policy
spec:
  # Reference the published OCI artifact
  module: registry://ghcr.io/my-org/my-custom-policy:v0.1.0

  settings:
    requiredAnnotations:
      - team
      - cost-center

  rules:
    - apiGroups: [""]
      apiVersions: ["v1"]
      resources: ["pods"]
      operations: ["CREATE", "UPDATE"]
  mutating: false
  mode: monitor  # Start in monitor mode for safety
```

## Automating Publication in CI/CD

```yaml
# .github/workflows/publish-policy.yml
name: Build and Publish Kubewarden Policy

on:
  push:
    tags: ['v*']

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Install Rust target
        run: rustup target add wasm32-wasip1

      - name: Install kwctl
        run: |
          curl -LO https://github.com/kubewarden/kwctl/releases/latest/download/kwctl-linux-x86_64.zip
          unzip kwctl-linux-x86_64.zip kwctl-linux-x86_64
          chmod +x kwctl-linux-x86_64
          sudo mv kwctl-linux-x86_64 /usr/local/bin/kwctl

      - name: Build policy
        run: cargo build --target wasm32-wasip1 --release

      - name: Annotate policy
        run: |
          kwctl annotate \
            target/wasm32-wasip1/release/my_policy.wasm \
            --metadata-path metadata.yml \
            --output-path annotated-policy.wasm

      - name: Run tests
        run: |
          kwctl run --request-path tests/valid.json annotated-policy.wasm
          kwctl run --request-path tests/invalid.json annotated-policy.wasm

      - name: Login to GHCR
        run: echo "${{ secrets.GITHUB_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Push policy to GHCR
        run: |
          VERSION="${GITHUB_REF#refs/tags/}"
          kwctl push annotated-policy.wasm \
            "registry://ghcr.io/${{ github.repository_owner }}/my-policy:${VERSION}"
          kwctl push annotated-policy.wasm \
            "registry://ghcr.io/${{ github.repository_owner }}/my-policy:latest"
```

## Versioning Strategy

Follow semantic versioning for your policies:
- `v0.1.0`: Initial release
- `v0.1.1`: Bug fixes
- `v0.2.0`: New settings added (backward compatible)
- `v1.0.0`: Stable API, first major release

```bash
# List all versions of a policy
regctl tag ls ghcr.io/my-org/my-custom-policy
```

## Conclusion

Publishing Kubewarden policies to OCI registries follows familiar container workflows, making it easy to integrate into existing CI/CD pipelines. By properly annotating your policies with metadata, running comprehensive tests before publishing, and using semantic versioning, you create a reliable policy distribution system that teams can trust. Whether publishing to a public registry like GHCR for community sharing or a private Harbor registry for internal distribution, the `kwctl push` command handles all the OCI artifact formatting automatically.
