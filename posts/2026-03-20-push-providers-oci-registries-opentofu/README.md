# How to Push Providers to OCI Registries with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OCI Registry, Provider Distribution, Container, Infrastructure

Description: Learn how to push OpenTofu provider plugins to OCI-compatible registries for distribution and version management, leveraging container registry infrastructure you already have.

## Introduction

OpenTofu 1.10+ supports using OCI (Open Container Initiative) registries as a secondary installation source for provider plugins. This lets you mirror provider packages into OCI-compatible registries using infrastructure you already have. OpenTofu still resolves providers by their original source address, so the OCI registry acts as a mirror rather than the provider's primary registry.

Pushing providers to OCI is different from pushing container images: OpenTofu expects a version-tagged OCI image index plus platform-specific manifests, not a Docker image.

## Prerequisites

```bash
# Install ORAS 1.3.0 or later for assembling OpenTofu provider mirror artifacts

# macOS
brew install oras

# Linux
VERSION="1.3.0"
curl -LO "https://github.com/oras-project/oras/releases/download/v${VERSION}/oras_${VERSION}_linux_amd64.tar.gz"
tar -xzf "oras_${VERSION}_linux_amd64.tar.gz"
sudo mv oras /usr/local/bin/

oras version
```

## Provider OCI Package Structure

```bash
# Start with the same ZIP packages that the provider's origin registry serves.
# ORAS writes the OCI image layout metadata (`oci-layout`, `index.json`, and `blobs/`)
# into a local layout directory during the push commands below.

provider-package/
├── terraform-provider-myprovider_1.0.0_linux_amd64.zip
├── terraform-provider-myprovider_1.0.0_linux_arm64.zip
└── terraform-provider-myprovider_1.0.0_darwin_arm64.zip
```

## Building a Provider for OCI Distribution

```makefile
# Makefile for building provider ZIP packages to mirror into OCI.
# These ZIP filenames should match the packages your provider's origin registry serves.

PROVIDER_NAME = myprovider
VERSION ?= 1.0.0
PLATFORMS = linux_amd64 linux_arm64 darwin_arm64

.PHONY: build package push

build:
	@mkdir -p dist
	@for PLATFORM in $(PLATFORMS); do \
		OS=$${PLATFORM%_*}; \
		ARCH=$${PLATFORM#*_}; \
		BIN="terraform-provider-$(PROVIDER_NAME)_$(VERSION)_$${OS}_$${ARCH}"; \
		echo "Building $${BIN}..."; \
		GOOS=$${OS} GOARCH=$${ARCH} go build -o "dist/$${BIN}" .; \
	done

package: build
	@for PLATFORM in $(PLATFORMS); do \
		OS=$${PLATFORM%_*}; \
		ARCH=$${PLATFORM#*_}; \
		zip -j "dist/terraform-provider-$(PROVIDER_NAME)_$(VERSION)_$${OS}_$${ARCH}.zip" \
			"dist/terraform-provider-$(PROVIDER_NAME)_$(VERSION)_$${OS}_$${ARCH}"; \
	done

push: package
	./push-provider-oci.sh
```

## Pushing to OCI Registry with oras

```bash
#!/bin/bash
# push-provider-oci.sh

set -euo pipefail

PROVIDER_NAME="myprovider"
NAMESPACE="mycompany"
VERSION="1.0.0"
REGISTRY="registry.internal.company.com"
DIST_DIR="./dist"
LAYOUT_DIR="./tmp-layout"

# Login to registry
oras login "$REGISTRY" \
  --username "$REGISTRY_USER" \
  --password "$REGISTRY_PASSWORD"

# Start with a clean local OCI image layout.
rm -rf "$LAYOUT_DIR"
mkdir -p "$LAYOUT_DIR"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/amd64 \
  --oci-layout "${LAYOUT_DIR}:linux_amd64" \
  "${DIST_DIR}/terraform-provider-${PROVIDER_NAME}_${VERSION}_linux_amd64.zip:archive/zip"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/arm64 \
  --oci-layout "${LAYOUT_DIR}:linux_arm64" \
  "${DIST_DIR}/terraform-provider-${PROVIDER_NAME}_${VERSION}_linux_arm64.zip:archive/zip"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform darwin/arm64 \
  --oci-layout "${LAYOUT_DIR}:darwin_arm64" \
  "${DIST_DIR}/terraform-provider-${PROVIDER_NAME}_${VERSION}_darwin_arm64.zip:archive/zip"

oras manifest index create \
  --artifact-type application/vnd.opentofu.provider \
  --oci-layout "${LAYOUT_DIR}:${VERSION}" \
  linux_amd64 \
  linux_arm64 \
  darwin_arm64

OCI_REF="${REGISTRY}/opentofu-providers/${NAMESPACE}/${PROVIDER_NAME}:${VERSION}"

oras cp \
  --from-oci-layout "${LAYOUT_DIR}:${VERSION}" \
  "$OCI_REF"

echo "Provider mirror pushed successfully: $OCI_REF"
```

## Configuring OpenTofu to Pull from OCI

```hcl
# .tofurc - configure an OCI provider mirror
provider_installation {
  oci_mirror {
    repository_template = "registry.internal.company.com/opentofu-providers/${namespace}/${type}"
    include             = ["registry.opentofu.org/mycompany/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/mycompany/*"]
  }
}
```

```hcl
# In your OpenTofu configuration
terraform {
  required_providers {
    myprovider = {
      source  = "mycompany/myprovider"
      version = "~> 1.0"
    }
  }
}
```

## GitHub Actions Pipeline for Provider Publishing

```yaml
# .github/workflows/publish-provider-oci.yml
name: Publish Provider to OCI

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  build-and-push:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Extract version
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> "$GITHUB_OUTPUT"

      - name: Build provider packages
        run: make package VERSION=${{ steps.version.outputs.version }}

      - name: Install oras
        run: |
          VERSION="1.3.0"
          curl -LO "https://github.com/oras-project/oras/releases/download/v${VERSION}/oras_${VERSION}_linux_amd64.tar.gz"
          tar -xzf "oras_${VERSION}_linux_amd64.tar.gz"
          sudo mv oras /usr/local/bin/

      - name: Login to registry
        env:
          OCI_REGISTRY_HOST: ${{ secrets.OCI_REGISTRY_HOST }}
          OCI_REGISTRY_USER: ${{ secrets.OCI_REGISTRY_USER }}
          OCI_REGISTRY_PASSWORD: ${{ secrets.OCI_REGISTRY_PASSWORD }}
        run: |
          oras login "$OCI_REGISTRY_HOST" \
            --username "$OCI_REGISTRY_USER" \
            --password "$OCI_REGISTRY_PASSWORD"

      - name: Build OCI mirror layout
        run: |
          VERSION="${{ steps.version.outputs.version }}"
          rm -rf tmp-layout
          mkdir -p tmp-layout

          oras push \
            --artifact-type application/vnd.opentofu.provider-target \
            --artifact-platform linux/amd64 \
            --oci-layout tmp-layout:linux_amd64 \
            "dist/terraform-provider-myprovider_${VERSION}_linux_amd64.zip:archive/zip"

          oras push \
            --artifact-type application/vnd.opentofu.provider-target \
            --artifact-platform linux/arm64 \
            --oci-layout tmp-layout:linux_arm64 \
            "dist/terraform-provider-myprovider_${VERSION}_linux_arm64.zip:archive/zip"

          oras push \
            --artifact-type application/vnd.opentofu.provider-target \
            --artifact-platform darwin/arm64 \
            --oci-layout tmp-layout:darwin_arm64 \
            "dist/terraform-provider-myprovider_${VERSION}_darwin_arm64.zip:archive/zip"

          oras manifest index create \
            --artifact-type application/vnd.opentofu.provider \
            --oci-layout "tmp-layout:${VERSION}" \
            linux_amd64 \
            linux_arm64 \
            darwin_arm64

      - name: Push to OCI registry
        env:
          OCI_REGISTRY_HOST: ${{ secrets.OCI_REGISTRY_HOST }}
        run: |
          VERSION="${{ steps.version.outputs.version }}"

          oras cp \
            --from-oci-layout "tmp-layout:${VERSION}" \
            "${OCI_REGISTRY_HOST}/opentofu-providers/mycompany/myprovider:${VERSION}"
```

## Inspecting OCI Provider Artifacts

```bash
# Inspect what's stored in the OCI registry
oras manifest fetch registry.internal.company.com/opentofu-providers/mycompany/myprovider:1.0.0

# List tags
oras repo tags registry.internal.company.com/opentofu-providers/mycompany/myprovider

# Pull and verify locally
oras pull --platform linux/amd64 \
  registry.internal.company.com/opentofu-providers/mycompany/myprovider:1.0.0 \
  --output /tmp/provider-check/
ls -la /tmp/provider-check/
```

## Conclusion

Pushing OpenTofu provider mirrors to OCI registries uses `oras` to assemble platform-specific manifests plus a version-tagged OCI image index that OpenTofu understands. The `oci_mirror` configuration in `.tofurc` tells OpenTofu to install matching providers from the OCI mirror while keeping the provider's original source address. Use semantic-version tags for mirrored releases; OpenTofu ignores non-version tags such as `latest`.
