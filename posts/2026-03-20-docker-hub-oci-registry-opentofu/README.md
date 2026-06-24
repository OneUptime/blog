# How to Use Docker Hub as OCI Registry for OpenTofu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTofu, Docker Hub, OCI Registry, Provider Distribution, Public Registry

Description: Learn how to use Docker Hub as an OCI registry for distributing OpenTofu providers and modules, leveraging Docker Hub's public and private repository infrastructure.

## Introduction

Docker Hub is OCI-compliant and can store OCI artifacts alongside container images. OpenTofu can install module packages directly from OCI registries, and can use OCI registries as provider mirrors. While ECR, ACR, or GCR are typically preferred for enterprise use, Docker Hub is useful for open-source provider mirrors and public modules that need to be freely accessible without cloud provider accounts. Docker Hub's Personal plan allows unlimited public repositories, although Docker documents pull limits of 100 pulls per 6 hours for anonymous image pulls and 200 pulls per 6 hours for authenticated Personal users.

## Docker Hub Repository Setup

```bash
# Login to Docker Hub

echo "$DOCKERHUB_TOKEN" | docker login \
  --username "$DOCKERHUB_USERNAME" \
  --password-stdin

# Create repositories via the Docker Hub UI if you want to control
# visibility and description before the first push

# For organizations, use organization namespaces:
# docker.io/mycompany/opentofu-provider-myprovider
```

## Pushing a Provider to Docker Hub

```bash
#!/bin/bash
# push-provider-dockerhub.sh

set -euo pipefail

DOCKERHUB_USER="${DOCKERHUB_USERNAME}"
PROVIDER_NAME="myprovider"
VERSION="1.0.0"
REGISTRY="registry-1.docker.io"
LAYOUT_DIR="tmp-layout"

# Login
echo "$DOCKERHUB_TOKEN" | oras login "$REGISTRY" \
  -u "$DOCKERHUB_USER" --password-stdin

# OpenTofu provider mirrors require an OCI image index where each platform
# is pushed as a separate manifest. Assume dist/ already contains the
# per-platform provider zip packages, for example:
# dist/terraform-provider-myprovider_1.0.0_linux_amd64.zip
# dist/terraform-provider-myprovider_1.0.0_linux_arm64.zip
# dist/terraform-provider-myprovider_1.0.0_darwin_arm64.zip
# dist/terraform-provider-myprovider_1.0.0_windows_amd64.zip
rm -rf "$LAYOUT_DIR"
mkdir -p "$LAYOUT_DIR"

for TARGET in linux_amd64 linux_arm64 darwin_arm64 windows_amd64; do
  OS="${TARGET%_*}"
  ARCH="${TARGET#*_}"

  oras push \
    --artifact-type application/vnd.opentofu.provider-target \
    --artifact-platform "${OS}/${ARCH}" \
    --oci-layout "${LAYOUT_DIR}:${TARGET}" \
    "dist/terraform-provider-${PROVIDER_NAME}_${VERSION}_${TARGET}.zip:archive/zip"
done

oras manifest index create \
  --artifact-type "application/vnd.opentofu.provider" \
  --oci-layout "${LAYOUT_DIR}:${VERSION}" \
  linux_amd64 \
  linux_arm64 \
  darwin_arm64 \
  windows_amd64

# Push the version tag to Docker Hub
REPO="${REGISTRY}/${DOCKERHUB_USER}/opentofu-provider-${PROVIDER_NAME}"

oras cp \
  --from-oci-layout "${LAYOUT_DIR}:${VERSION}" \
  "${REPO}:${VERSION}"

echo "Pushed: ${REPO}:${VERSION}"
```

## Pushing Modules to Docker Hub

```bash
#!/bin/bash
# push-module-dockerhub.sh

MODULE_DIR="${1:?Usage: $0 <module-dir> <version>}"
VERSION="${2:?}"
DOCKERHUB_USER="${DOCKERHUB_USERNAME}"
MODULE_NAME=$(basename "$MODULE_DIR")
REGISTRY="registry-1.docker.io"
REPO="${REGISTRY}/${DOCKERHUB_USER}/opentofu-module-${MODULE_NAME}"
ARCHIVE="${MODULE_NAME}-${VERSION}.zip"

echo "$DOCKERHUB_TOKEN" | oras login "$REGISTRY" \
  -u "$DOCKERHUB_USER" --password-stdin

(
  cd "$MODULE_DIR"
  zip -r "../${ARCHIVE}" . \
    -x '.terraform/*' '*.tfstate*' '.git/*'
)

oras push \
  --artifact-type=application/vnd.opentofu.modulepkg \
  "${REPO}:${VERSION}" \
  "${ARCHIVE}:archive/zip"

# Tag as latest
oras tag "${REPO}:${VERSION}" latest

rm "${ARCHIVE}"
echo "Module available at: oci://${REPO}?tag=${VERSION}"
```

## Configuring OpenTofu to Use Docker Hub

```hcl
# ~/.tofurc - for public Docker Hub repositories (no auth needed)

provider_installation {
  oci_mirror {
    repository_template = "registry-1.docker.io/mycompany/opentofu-provider-${type}"
    include             = ["registry.opentofu.org/mycompany/*"]
  }

  direct {
    exclude = ["registry.opentofu.org/mycompany/*"]
  }
}
```

```hcl
# For private Docker Hub repositories, OpenTofu can reuse
# ~/.docker/config.json written by docker login/oras login,
# or you can set explicit OCI credentials:
oci_credentials "registry-1.docker.io" {
  username = "mycompany"
  password = "dckr_pat_..."
}
```

## Using Public Modules from Docker Hub

```hcl
# Reference a public module from Docker Hub
module "vpc" {
  source = "oci://registry-1.docker.io/mycompany/opentofu-module-vpc?tag=1.0.0"

  name = "production"
  cidr = "10.0.0.0/16"
}

# Public repositories don't require authentication
# Anyone can pull without credentials
```

## GitHub Actions for Publishing to Docker Hub

```yaml
# .github/workflows/publish-to-dockerhub.yml
name: Publish to Docker Hub

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Go
        uses: actions/setup-go@v5
        with:
          go-version: '1.21'

      - name: Extract version
        id: version
        run: echo "version=${GITHUB_REF_NAME#v}" >> $GITHUB_OUTPUT

      - name: Install oras
        run: |
          curl -LO https://github.com/oras-project/oras/releases/download/v1.3.0/oras_1.3.0_linux_amd64.tar.gz
          tar -xzf oras_1.3.0_linux_amd64.tar.gz
          sudo mv oras /usr/local/bin/

      - name: Login to Docker Hub
        run: |
          echo "${{ secrets.DOCKERHUB_TOKEN }}" | \
            oras login registry-1.docker.io -u "${{ secrets.DOCKERHUB_USERNAME }}" --password-stdin

      - name: Build and push provider
        run: |
          VERSION="${{ steps.version.outputs.version }}"
          make package VERSION="$VERSION"

          rm -rf tmp-layout
          for target in linux_amd64 linux_arm64 darwin_arm64 windows_amd64; do
            os="${target%_*}"
            arch="${target#*_}"

            oras push \
              --artifact-type application/vnd.opentofu.provider-target \
              --artifact-platform "${os}/${arch}" \
              --oci-layout "tmp-layout:${target}" \
              "dist/terraform-provider-myprovider_${VERSION}_${target}.zip:archive/zip"
          done

          oras manifest index create \
            --artifact-type "application/vnd.opentofu.provider" \
            --oci-layout "tmp-layout:${VERSION}" \
            linux_amd64 \
            linux_arm64 \
            darwin_arm64 \
            windows_amd64

          oras cp \
            --from-oci-layout "tmp-layout:${VERSION}" \
            "registry-1.docker.io/${{ secrets.DOCKERHUB_USERNAME }}/opentofu-provider-myprovider:${VERSION}"

      - name: Update Docker Hub description
        uses: peter-evans/dockerhub-description@v5
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
          repository: ${{ secrets.DOCKERHUB_USERNAME }}/opentofu-provider-myprovider
          readme-filepath: ./README.md
```

## Docker Hub Rate Limits

```bash
# Docker Hub pull limits for image pulls:
# Anonymous: 100 pulls/6 hours per IPv4 address or IPv6 /64 subnet
# Authenticated Personal: 200 pulls/6 hours
# Authenticated Pro/Team/Business: unlimited

# Authenticate in CI/CD when interacting with Docker Hub
echo "$DOCKERHUB_TOKEN" | docker login \
  --username "$DOCKERHUB_USERNAME" \
  --password-stdin

# Check your current rate limit status
TOKEN=$(curl "https://auth.docker.io/token?service=registry.docker.io&scope=repository:ratelimitpreview/test:pull" | jq -r .token)
curl --head -H "Authorization: Bearer $TOKEN" \
  https://registry-1.docker.io/v2/ratelimitpreview/test/manifests/latest | grep -i ratelimit
```

## Conclusion

Docker Hub works as an OCI registry for OpenTofu modules and as a mirror target for OpenTofu providers, with the main advantage being public repositories accessible without cloud provider accounts. Use Docker Hub for open-source provider mirrors and public modules that anyone should be able to consume without authentication. For higher documented pull limits on Docker Hub, Pro, Team, and Business plans provide unlimited authenticated pulls, while Personal accounts and anonymous users remain rate-limited.
