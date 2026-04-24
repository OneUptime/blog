# How to Push Modules to OCI Registries with OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, OCI Registry, Module Distribution, Container, Infrastructure

Description: Learn how to package and push OpenTofu modules to OCI-compatible registries for version-controlled module distribution within your organization.

## Introduction

OpenTofu supports sourcing modules from OCI registries using the `oci://` source address scheme. Pushing modules to OCI registries packages your module directories as OCI artifacts, enabling version-controlled module distribution through the same container registry infrastructure you already use for Docker images.

## Packaging a Module for OCI

```bash
# Module structure to be packaged

my-vpc-module/
├── main.tf
├── variables.tf
├── outputs.tf
├── versions.tf
└── README.md

# Create a module archive
(
  cd my-vpc-module
  zip -r ../my-vpc-module-1.0.0.zip . \
    -x '.terraform/*' \
    -x '*.tfstate' \
    -x '*.tfstate.*' \
    -x '.git/*'
)

# Verify archive contents
unzip -l my-vpc-module-1.0.0.zip
```

## Pushing to OCI with oras

```bash
# Install oras
brew install oras  # macOS
# or: https://github.com/oras-project/oras/releases

# Login to registry
oras login registry.internal.company.com \
  --username "$REGISTRY_USER" \
  --password "$REGISTRY_PASSWORD"

# Push module as OCI artifact
REGISTRY="registry.internal.company.com"
NAMESPACE="mycompany"
MODULE="vpc"
VERSION="1.0.0"

oras push "${REGISTRY}/${NAMESPACE}/module-${MODULE}:${VERSION}" \
  --artifact-type application/vnd.opentofu.modulepkg \
  my-vpc-module-${VERSION}.zip:archive/zip

echo "Module pushed: ${REGISTRY}/${NAMESPACE}/module-${MODULE}:${VERSION}"

# Tag as latest
oras tag "${REGISTRY}/${NAMESPACE}/module-${MODULE}:${VERSION}" latest
```

## Automated Push Script

```bash
#!/bin/bash
# push-module.sh - Push an OpenTofu module to OCI

set -euo pipefail

MODULE_DIR="${1:?Usage: $0 <module-dir> <version>}"
VERSION="${2:?Usage: $0 <module-dir> <version>}"
REGISTRY="${REGISTRY:-registry.internal.company.com}"
NAMESPACE="${NAMESPACE:-mycompany}"

MODULE_NAME=$(basename "$MODULE_DIR")
ARCHIVE="${MODULE_NAME}-${VERSION}.zip"
OCI_REF="${REGISTRY}/${NAMESPACE}/module-${MODULE_NAME}:${VERSION}"

echo "Packaging module: $MODULE_DIR"
(
  cd "$MODULE_DIR"
  zip -r "/tmp/$ARCHIVE" . \
    -x '.terraform/*' \
    -x '*.tfstate*' \
    -x '.git/*'
)

echo "Pushing to: $OCI_REF"
oras push "$OCI_REF" \
  --artifact-type application/vnd.opentofu.modulepkg \
  "/tmp/$ARCHIVE:archive/zip"

# Add semantic version tags
MAJOR=$(echo "$VERSION" | cut -d. -f1)
MINOR=$(echo "$VERSION" | cut -d. -f1-2)

oras tag "$OCI_REF" "$MAJOR" "$MINOR" latest

rm -f "/tmp/$ARCHIVE"
echo "Done: $OCI_REF"
```

## GitHub Actions Publishing Pipeline

```yaml
# .github/workflows/publish-module.yml
name: Publish Module to OCI

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Install oras
        run: |
          curl -LO https://github.com/oras-project/oras/releases/download/v1.3.0/oras_1.3.0_linux_amd64.tar.gz
          tar -xzf oras_1.3.0_linux_amd64.tar.gz
          sudo mv oras /usr/local/bin/

      - name: Validate module
        run: |
          curl -Lo tofu.zip \
            https://github.com/opentofu/opentofu/releases/download/v1.11.6/tofu_1.11.6_linux_amd64.zip
          sudo unzip tofu.zip tofu -d /usr/local/bin/
          tofu init -backend=false
          tofu validate

      - name: Extract version
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Login to GitHub Container Registry
        run: |
          oras login ghcr.io \
            --username ${{ github.actor }} \
            --password ${{ secrets.GITHUB_TOKEN }}

      - name: Package and push module
        run: |
          VERSION="${{ steps.version.outputs.version }}"
          MODULE_NAME="${{ github.event.repository.name }}"
          ORG="${{ github.repository_owner }}"

          # Create archive
          zip -r "${MODULE_NAME}-${VERSION}.zip" . \
            -x '.terraform/*' \
            -x '*.tfstate*' \
            -x '.git/*'

          # Push to GHCR
          oras push "ghcr.io/${ORG}/module-${MODULE_NAME}:${VERSION}" \
            --artifact-type application/vnd.opentofu.modulepkg \
            "${MODULE_NAME}-${VERSION}.zip:archive/zip"

          # Also tag as latest
          oras tag "ghcr.io/${ORG}/module-${MODULE_NAME}:${VERSION}" latest
```

## Inspecting Pushed Modules

```bash
# List available module versions in OCI
oras repo tags registry.internal.company.com/mycompany/module-vpc

# Inspect the manifest
oras manifest fetch registry.internal.company.com/mycompany/module-vpc:1.0.0

# Pull and inspect module contents
mkdir -p /tmp/module-inspect
oras pull registry.internal.company.com/mycompany/module-vpc:1.0.0 \
  --output /tmp/module-inspect/
unzip -l /tmp/module-inspect/*.zip
```

## Version Inventory Script

```bash
#!/bin/bash
# list-oci-modules.sh - Show all modules and versions in OCI registry

REGISTRY="registry.internal.company.com"
NAMESPACE="mycompany"

echo "OpenTofu Modules in OCI Registry"
echo "Registry: $REGISTRY"
echo "================================="

# List all module repositories
oras repo ls "${REGISTRY}/${NAMESPACE}" | while read -r repo; do
  REPO_NAME=$(basename "$repo")
  case "$REPO_NAME" in
    module-*)
      MODULE="${REPO_NAME#module-}"
      TAGS=$(oras repo tags "${REGISTRY}/${NAMESPACE}/${REPO_NAME}" 2>/dev/null | paste -sd ',' - | sed 's/,/, /g')
      echo "  ${MODULE}: ${TAGS}"
      ;;
  esac
done
```

## Conclusion

Pushing modules to OCI registries uses `oras push` with `--artifact-type application/vnd.opentofu.modulepkg` and a single `archive/zip` layer to package module directories as `.zip` archives. Use explicit tags such as major, minor, patch, and `latest` so consumers can choose the tag they want in the module source string. The GitHub Actions pipeline shows the full automated workflow: validate → package → push - triggered on version tags. Once pushed, modules are referenced in configurations using the `oci://` source address scheme.
