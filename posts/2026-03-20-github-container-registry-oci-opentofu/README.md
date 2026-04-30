# How to Use GitHub Container Registry as OCI Registry for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, GitHub Container Registry, OCI Registry, GHCR, Provider Distribution

Description: Learn how to use GitHub Container Registry (GHCR) as an OCI registry for distributing OpenTofu providers and modules, with tight integration into GitHub Actions workflows.

## Introduction

GitHub Container Registry (GHCR) is OCI-compliant and tightly integrated with GitHub Actions, making it the natural choice for teams already using GitHub for source control and CI/CD. GHCR supports public and private packages, personal access token (classic) authentication, and automatic `GITHUB_TOKEN`-based authentication from GitHub Actions workflows without storing a long-lived personal access token in CI.

## GHCR Authentication

```bash
# Personal access token (classic) - use read:packages or write:packages as needed

echo "$CR_PAT" | docker login ghcr.io \
  -u USERNAME --password-stdin

# In GitHub Actions, grant packages: write and use the automatic GITHUB_TOKEN
echo "${{ secrets.GITHUB_TOKEN }}" | oras login ghcr.io \
  -u "${{ github.actor }}" --password-stdin
```

## GHCR Package Visibility

```bash
# Container packages in GHCR default to private.
# If a package is linked to a repository before publishing, it can inherit
# repository access permissions, but not repository visibility.
# For anonymous pulls, open the package page on GitHub and change
# Package settings -> Change visibility -> Public.
```

## Pushing Providers to GHCR

```bash
#!/bin/bash
# push-provider-ghcr.sh
# Requires ORAS v1.3.0 or later.

set -euo pipefail

GITHUB_ORG="${GITHUB_ORG:?set GITHUB_ORG}"
GITHUB_ACTOR="${GITHUB_ACTOR:?set GITHUB_ACTOR}"
GITHUB_TOKEN="${GITHUB_TOKEN:?set GITHUB_TOKEN}"
PROVIDER_NAMESPACE="hashicorp"
PROVIDER_TYPE="aws"
PROVIDER_VERSION="5.20.1"
GHCR_REGISTRY="ghcr.io"

# Login using GITHUB_TOKEN
echo "$GITHUB_TOKEN" | oras login "$GHCR_REGISTRY" \
  -u "$GITHUB_ACTOR" --password-stdin

# Download provider
WORK_DIR=$(mktemp -d)
trap 'rm -rf "$WORK_DIR"' EXIT

cat > "$WORK_DIR/versions.tf" <<EOF
terraform {
  required_providers {
    aws = {
      source  = "${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"
      version = "= ${PROVIDER_VERSION}"
    }
  }
}
EOF

cd "$WORK_DIR"
tofu init -backend=false
tofu providers mirror \
  -platform=linux_amd64 \
  -platform=linux_arm64 \
  -platform=darwin_arm64 \
  "$WORK_DIR/mirror"

PROVIDER_DIR="$WORK_DIR/mirror/registry.opentofu.org/${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}"
LAYOUT_DIR="$WORK_DIR/layout"
ARTIFACT="${GHCR_REGISTRY}/${GITHUB_ORG}/opentofu-providers/${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}:${PROVIDER_VERSION}"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/amd64 \
  --oci-layout "$LAYOUT_DIR:linux_amd64" \
  "$PROVIDER_DIR/terraform-provider-${PROVIDER_TYPE}_${PROVIDER_VERSION}_linux_amd64.zip:archive/zip"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform linux/arm64 \
  --oci-layout "$LAYOUT_DIR:linux_arm64" \
  "$PROVIDER_DIR/terraform-provider-${PROVIDER_TYPE}_${PROVIDER_VERSION}_linux_arm64.zip:archive/zip"

oras push \
  --artifact-type application/vnd.opentofu.provider-target \
  --artifact-platform darwin/arm64 \
  --oci-layout "$LAYOUT_DIR:darwin_arm64" \
  "$PROVIDER_DIR/terraform-provider-${PROVIDER_TYPE}_${PROVIDER_VERSION}_darwin_arm64.zip:archive/zip"

oras manifest index create \
  --artifact-type="application/vnd.opentofu.provider" \
  --oci-layout "$LAYOUT_DIR:${PROVIDER_VERSION}" \
  linux_amd64 \
  linux_arm64 \
  darwin_arm64

oras cp \
  --from-oci-layout "$LAYOUT_DIR:${PROVIDER_VERSION}" \
  "$ARTIFACT"

echo "Pushed: $ARTIFACT"
```

## GitHub Actions: Automated Provider Mirror Updates

```yaml
# .github/workflows/update-provider-mirror.yml
name: Update Provider Mirror

on:
  schedule:
    - cron: '0 3 * * 1'  # Weekly on Monday at 3 AM
  workflow_dispatch:

jobs:
  update-mirror:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: opentofu/setup-opentofu@v1
        with:
          tofu_version: '1.11.0'

      - name: Install oras
        run: |
          VERSION="1.3.0"
          curl -LO "https://github.com/oras-project/oras/releases/download/v${VERSION}/oras_${VERSION}_linux_amd64.tar.gz"
          mkdir -p oras-install/
          tar -zxf "oras_${VERSION}_linux_amd64.tar.gz" -C oras-install/
          sudo mv oras-install/oras /usr/local/bin/
          rm -rf "oras_${VERSION}_linux_amd64.tar.gz" oras-install/

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            oras login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Mirror providers
        run: |
          set -euo pipefail

          # Init to get latest compatible versions
          tofu init -backend=false
          tofu providers mirror \
            -platform=linux_amd64 \
            -platform=linux_arm64 \
            /tmp/mirror/

          shopt -s nullglob

          # Push each provider
          for PROVIDER_DIR in /tmp/mirror/registry.opentofu.org/*/*; do
            [ -d "$PROVIDER_DIR" ] || continue

            NAMESPACE=$(basename "$(dirname "$PROVIDER_DIR")")
            TYPE=$(basename "$PROVIDER_DIR")
            LINUX_AMD64_ZIP=$(find "$PROVIDER_DIR" -maxdepth 1 -type f -name "terraform-provider-${TYPE}_*_linux_amd64.zip" | head -n 1)
            VERSION=$(basename "$LINUX_AMD64_ZIP")
            VERSION=${VERSION#"terraform-provider-${TYPE}_"}
            VERSION=${VERSION%_linux_amd64.zip}
            LAYOUT_DIR="/tmp/layout-${NAMESPACE}-${TYPE}"
            TAGS=()

            for TARGET in linux_amd64 linux_arm64; do
              ZIP_FILE="$PROVIDER_DIR/terraform-provider-${TYPE}_${VERSION}_${TARGET}.zip"
              [ -f "$ZIP_FILE" ] || continue

              oras push \
                --artifact-type application/vnd.opentofu.provider-target \
                --artifact-platform "${TARGET/_//}" \
                --oci-layout "$LAYOUT_DIR:${TARGET}" \
                "$ZIP_FILE:archive/zip"

              TAGS+=("$TARGET")
            done

            oras manifest index create \
              --artifact-type="application/vnd.opentofu.provider" \
              --oci-layout "$LAYOUT_DIR:${VERSION}" \
              "${TAGS[@]}"

            ARTIFACT="ghcr.io/${{ github.repository_owner }}/opentofu-providers/${NAMESPACE}/${TYPE}:${VERSION}"
            echo "Pushing $ARTIFACT"
            oras cp --from-oci-layout "$LAYOUT_DIR:${VERSION}" "$ARTIFACT"
          done
```

## GitHub Actions: Publishing Custom Provider

```yaml
# .github/workflows/publish-provider.yml
name: Publish Provider to GHCR

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      packages: write
      contents: read

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Extract version
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Install oras
        run: |
          VERSION="1.3.0"
          curl -LO "https://github.com/oras-project/oras/releases/download/v${VERSION}/oras_${VERSION}_linux_amd64.tar.gz"
          mkdir -p oras-install/
          tar -zxf "oras_${VERSION}_linux_amd64.tar.gz" -C oras-install/
          sudo mv oras-install/oras /usr/local/bin/
          rm -rf "oras_${VERSION}_linux_amd64.tar.gz" oras-install/

      - name: Build provider
        run: make package VERSION=${{ steps.version.outputs.version }}

      - name: Login to GHCR
        run: |
          echo "${{ secrets.GITHUB_TOKEN }}" | \
            oras login ghcr.io -u ${{ github.actor }} --password-stdin

      - name: Push to GHCR
        run: |
          VERSION="${{ steps.version.outputs.version }}"
          ORG="${{ github.repository_owner }}"
          PROVIDER_NAMESPACE="myorg"
          PROVIDER_TYPE="myprovider"
          LAYOUT_DIR="$RUNNER_TEMP/provider-layout"
          ARTIFACT="ghcr.io/${ORG}/opentofu-providers/${PROVIDER_NAMESPACE}/${PROVIDER_TYPE}:${VERSION}"

          cd dist/

          oras push \
            --artifact-type application/vnd.opentofu.provider-target \
            --artifact-platform linux/amd64 \
            --oci-layout "$LAYOUT_DIR:linux_amd64" \
            "terraform-provider-${PROVIDER_TYPE}_${VERSION}_linux_amd64.zip:archive/zip"

          oras manifest index create \
            --artifact-type="application/vnd.opentofu.provider" \
            --oci-layout "$LAYOUT_DIR:${VERSION}" \
            linux_amd64

          oras cp \
            --from-oci-layout "$LAYOUT_DIR:${VERSION}" \
            "$ARTIFACT"
```

## Configuring OpenTofu to Use GHCR

```hcl
# ~/.tofurc
# OpenTofu can also reuse credentials written by `docker login ghcr.io`
# or `oras login ghcr.io`.

oci_credentials "ghcr.io/myorg/opentofu-providers" {
  username = "YOUR_GITHUB_USERNAME"
  password = "ghp_yourPersonalAccessToken"
}

provider_installation {
  oci_mirror {
    repository_template = "ghcr.io/myorg/opentofu-providers/${namespace}/${type}"
    include             = ["registry.opentofu.org/hashicorp/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/hashicorp/*"]
  }
}
```

## Conclusion

GHCR is a strong OCI registry choice for GitHub-based workflows because GitHub Actions can publish packages with the automatic `GITHUB_TOKEN` when the workflow grants `packages: write`, avoiding the need to store a long-lived personal access token in CI. For public open-source providers, setting the package visibility to public allows anyone to pull providers without authentication, making distribution frictionless for the open-source community.
